package services

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptrace"
	"net/http/httputil"
	"net/url"
	"post-pigeon/internal/models"
	"post-pigeon/internal/scripting"
	"strings"
	"time"

	"gorm.io/gorm"
)

// HTTPService HTTP 请求服务
type HTTPService struct {
	db     *gorm.DB
	engine *scripting.Engine
}

// NewHTTPService 创建 HTTP 服务实例
func NewHTTPService(db *gorm.DB) *HTTPService {
	return &HTTPService{db: db, engine: scripting.New()}
}

// SendRequestData 发送请求的参数
type SendRequestData struct {
	EndpointID      string                     `json:"endpointId"`
	ModuleID        string                     `json:"moduleId"`
	EnvironmentID   string                     `json:"environmentId"`
	Method          string                     `json:"method"`
	BaseURL         string                     `json:"baseUrl"`
	Path            string                     `json:"path"`
	Headers         []models.EndpointHeader    `json:"headers"`
	Params          []models.EndpointParam     `json:"params"`
	BodyType        string                     `json:"bodyType"`
	BodyContent     string                     `json:"bodyContent"`
	ContentType     string                     `json:"contentType"`
	BodyFields      []models.EndpointBodyField `json:"bodyFields"`
	Auth            *models.EndpointAuth       `json:"auth"`
	Timeout         int                        `json:"timeout"`
	FollowRedirects bool                       `json:"followRedirects"`
	// PreRequestScript 前置脚本，请求发送前执行
	PreRequestScript string `json:"preRequestScript"`
	// PostResponseScript 后置脚本，响应返回后执行
	PostResponseScript string `json:"postResponseScript"`
}

// ScriptResults 前置/后置脚本的执行结果，随响应返回给前端展示
type ScriptResults struct {
	PreRequest   *scripting.Result `json:"preRequest,omitempty"`
	PostResponse *scripting.Result `json:"postResponse,omitempty"`
}

// HTTPResponseData HTTP 响应数据
type HTTPResponseData struct {
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       string              `json:"body"`
	// RawBody 原始响应字节的 base64 编码，供前端按任意字符集解码（GBK 等）
	RawBody       string                   `json:"rawBody"`
	ContentType   string                   `json:"contentType"`
	Cookies       []models.CookieInfo      `json:"cookies"`
	Timing        models.TimingInfo        `json:"timing"`
	Size          int64                    `json:"size"`
	ActualRequest models.ActualRequestInfo `json:"actualRequest"`
	// Scripts 前置/后置脚本执行结果（无脚本时为 nil）
	Scripts *ScriptResults `json:"scripts,omitempty"`
}

// SendRequest 发送 HTTP 请求
func (s *HTTPService) SendRequest(data SendRequestData) (*HTTPResponseData, error) {
	envService := NewEnvironmentService(s.db)

	// 载入环境变量到内存变量存储；前置脚本读写的是这份存储，
	// 请求结束后再把增量持久化回数据库。
	envVars := map[string]string{}
	if data.EnvironmentID != "" {
		if vars, err := envService.GetEnvironmentVariables(data.EnvironmentID); err == nil {
			for _, v := range vars {
				if v.Enabled {
					envVars[v.Key] = v.Value
				}
			}
		} else {
			slog.Warn("载入环境变量失败", "error", err)
		}
	}
	stores := scripting.Stores{
		Environment: scripting.NewVarStore(envVars),
		Globals:     scripting.NewVarStore(nil),
		Collection:  scripting.NewVarStore(nil),
	}

	scriptResults := &ScriptResults{}

	// 构建可被前置脚本修改的请求上下文
	reqCtx := &scripting.RequestData{
		Method:  data.Method,
		URL:     combineURL(data.BaseURL, data.Path),
		Headers: enabledHeaders(data.Headers),
		Body:    data.BodyContent,
	}

	// 执行前置脚本（可修改 method/url/headers/body 及环境变量）
	if strings.TrimSpace(data.PreRequestScript) != "" {
		scriptResults.PreRequest = s.engine.Run(data.PreRequestScript, scripting.Options{
			Phase:   scripting.PhasePreRequest,
			Request: reqCtx,
			Stores:  stores,
		})
		// 将脚本对请求的修改应用回 data
		data.Method = reqCtx.Method
		data.BodyContent = reqCtx.Body
		data.Headers = headersToModel(reqCtx.Headers)
	}

	// 用（可能被脚本更新过的）变量存储解析占位符
	vars := stores.Environment.ToMap()

	// 组合 URL（前置脚本可能已改写整条 URL）
	fullURL := resolveVars(reqCtx.URL, vars)

	// 解析 URL 中的查询参数
	parsedURL, err := url.Parse(fullURL)
	if err != nil {
		return nil, fmt.Errorf("无效的URL: %w", err)
	}

	// 添加查询参数
	query := parsedURL.Query()
	for _, param := range data.Params {
		if param.Enabled && param.Type == "query" {
			query.Add(param.Name, resolveVars(param.Value, vars))
		}
	}
	// 前置脚本通过 pm.request.url.query.add(...) 追加的查询参数
	for _, q := range reqCtx.Query {
		query.Add(q.Key, resolveVars(q.Value, vars))
	}
	parsedURL.RawQuery = query.Encode()

	// 创建请求
	timeout := time.Duration(data.Timeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(data.Method), parsedURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	// 设置请求头
	for _, header := range data.Headers {
		if header.Enabled {
			req.Header.Set(header.Name, resolveVars(header.Value, vars))
		}
	}

	// 设置请求体
	if err := s.setRequestBody(req, data, vars); err != nil {
		return nil, err
	}

	// 设置认证信息
	if data.Auth != nil && data.Auth.Type != string(models.AuthTypeNone) {
		if err := s.setAuthHeader(req, data.Auth); err != nil {
			return nil, err
		}
	}

	// 记录实际请求信息
	actualReq := models.ActualRequestInfo{
		Method:  req.Method,
		URL:     req.URL.String(),
		Headers: flattenHeaders(req.Header),
	}

	// 记录请求体
	if req.GetBody != nil {
		bodyReader, _ := req.GetBody()
		if bodyReader != nil {
			bodyBytes, _ := io.ReadAll(bodyReader)
			actualReq.Body = string(bodyBytes)
		}
	}

	// 创建 HTTP 客户端
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar: jar,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: false,
			},
		},
	}

	// 处理重定向
	if !data.FollowRedirects {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	// 计时
	var dnsStart, dnsEnd, tlsStart, tlsEnd, connectStart, connectEnd, gotFirstByte time.Time
	var start time.Time

	trace := &httptraceCollector{
		dnsStart:     &dnsStart,
		dnsEnd:       &dnsEnd,
		tlsStart:     &tlsStart,
		tlsEnd:       &tlsEnd,
		connectStart: &connectStart,
		connectEnd:   &connectEnd,
		gotFirstByte: &gotFirstByte,
	}

	// 发送请求
	start = time.Now()
	resp, err := client.Do(req.WithContext(trace.attach(ctx)))
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	totalTime := time.Since(start)

	// 读取响应体
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	// 计算计时信息
	timing := models.TimingInfo{
		Total: totalTime.Milliseconds(),
	}
	if !dnsStart.IsZero() && !dnsEnd.IsZero() {
		timing.DNSLookup = dnsEnd.Sub(dnsStart).Milliseconds()
	}
	if !connectStart.IsZero() && !connectEnd.IsZero() {
		timing.TCPConnect = connectEnd.Sub(connectStart).Milliseconds()
	}
	if !tlsStart.IsZero() && !tlsEnd.IsZero() {
		timing.TLSHandshake = tlsEnd.Sub(tlsStart).Milliseconds()
	}
	if !gotFirstByte.IsZero() {
		timing.TTFB = gotFirstByte.Sub(start).Milliseconds()
	}

	// 解析 Cookie
	cookies := parseCookies(resp.Cookies())

	// 构建响应数据
	responseData := &HTTPResponseData{
		StatusCode:    resp.StatusCode,
		Headers:       resp.Header,
		Body:          string(bodyBytes),
		RawBody:       base64.StdEncoding.EncodeToString(bodyBytes),
		ContentType:   resp.Header.Get("Content-Type"),
		Cookies:       cookies,
		Timing:        timing,
		Size:          int64(len(bodyBytes)),
		ActualRequest: actualReq,
	}

	// 执行后置脚本（可读取响应、修改响应体/响应头、运行断言、读写变量）
	if strings.TrimSpace(data.PostResponseScript) != "" {
		respCtx := &scripting.ResponseData{
			Code:         resp.StatusCode,
			Status:       http.StatusText(resp.StatusCode),
			Headers:      flattenToHeaders(resp.Header),
			Body:         string(bodyBytes),
			ResponseTime: timing.Total,
			ResponseSize: int64(len(bodyBytes)),
		}
		scriptResults.PostResponse = s.engine.Run(data.PostResponseScript, scripting.Options{
			Phase:    scripting.PhasePostResponse,
			Request:  reqCtx,
			Response: respCtx,
			Stores:   stores,
		})
		// 应用后置脚本对响应的修改（setBody / headers）
		if respCtx.Body != string(bodyBytes) {
			responseData.Body = respCtx.Body
			responseData.RawBody = base64.StdEncoding.EncodeToString([]byte(respCtx.Body))
			responseData.Size = int64(len(respCtx.Body))
		}
		mutatedHeaders := headersToHTTPHeader(respCtx.Headers)
		responseData.Headers = mutatedHeaders
		if ct := mutatedHeaders.Get("Content-Type"); ct != "" {
			responseData.ContentType = ct
		}
	}

	// 将脚本对环境变量的增量持久化回数据库
	if data.EnvironmentID != "" {
		upserts, removed := stores.Environment.Changes()
		if err := envService.ApplyVariableChanges(data.EnvironmentID, upserts, removed); err != nil {
			slog.Error("持久化脚本变量失败", "error", err)
		}
	}

	// 附加脚本执行结果（无脚本时保持 nil）
	if scriptResults.PreRequest != nil || scriptResults.PostResponse != nil {
		responseData.Scripts = scriptResults
	}

	// 异步保存响应和请求历史
	go s.saveResponseAndHistory(data, responseData)

	return responseData, nil
}

// setRequestBody 设置请求体
func (s *HTTPService) setRequestBody(req *http.Request, data SendRequestData, vars map[string]string) error {
	switch data.BodyType {
	case string(models.BodyTypeNone):
		// 无请求体
		return nil

	case string(models.BodyTypeJSON), string(models.BodyTypeText):
		// JSON 或纯文本
		resolvedContent := resolveVars(data.BodyContent, vars)
		req.Body = io.NopCloser(strings.NewReader(resolvedContent))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(strings.NewReader(resolvedContent)), nil
		}
		req.ContentLength = int64(len(resolvedContent))
		if data.ContentType != "" {
			req.Header.Set("Content-Type", data.ContentType)
		} else if data.BodyType == string(models.BodyTypeJSON) {
			req.Header.Set("Content-Type", "application/json")
		} else {
			req.Header.Set("Content-Type", "text/plain")
		}

	case string(models.BodyTypeFormData):
		// multipart/form-data：用标准库 multipart.Writer 正确处理文本字段与文件字段（含二进制内容）
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			if field.FieldType == "file" {
				// 文件字段：value 约定为 {"fileName":..,"content":<base64>}
				fileName, content, ok := parseFileField(field.Value)
				if !ok {
					// 兼容旧数据：value 当作文件名，无内容
					fileName = field.Value
				}
				part, err := writer.CreateFormFile(field.Name, fileName)
				if err != nil {
					return fmt.Errorf("创建文件表单项失败: %w", err)
				}
				if _, err := part.Write(content); err != nil {
					return fmt.Errorf("写入文件内容失败: %w", err)
				}
			} else {
				if err := writer.WriteField(field.Name, resolveVars(field.Value, vars)); err != nil {
					return fmt.Errorf("写入表单字段失败: %w", err)
				}
			}
		}
		if err := writer.Close(); err != nil {
			return fmt.Errorf("关闭 multipart writer 失败: %w", err)
		}
		body := buf.Bytes()
		req.Body = io.NopCloser(bytes.NewReader(body))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(bytes.NewReader(body)), nil
		}
		req.ContentLength = int64(len(body))
		req.Header.Set("Content-Type", writer.FormDataContentType())

	case string(models.BodyTypeURLEncoded):
		// application/x-www-form-urlencoded
		values := url.Values{}
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			values.Set(field.Name, resolveVars(field.Value, vars))
		}
		body := values.Encode()
		req.Body = io.NopCloser(strings.NewReader(body))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(strings.NewReader(body)), nil
		}
		req.ContentLength = int64(len(body))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	return nil
}

// setAuthHeader 设置认证请求头
func (s *HTTPService) setAuthHeader(req *http.Request, auth *models.EndpointAuth) error {
	switch auth.Type {
	case string(models.AuthTypeBasic):
		var data models.BasicAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return fmt.Errorf("解析 Basic Auth 数据失败: %w", err)
		}
		req.SetBasicAuth(data.Username, data.Password)

	case string(models.AuthTypeBearer):
		var data models.BearerAuthData
		if err := models.FromJSON(auth.Data, &data); err != nil {
			return fmt.Errorf("解析 Bearer Token 数据失败: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+data.Token)
	}
	return nil
}

// saveResponseAndHistory 保存响应和请求历史
func (s *HTTPService) saveResponseAndHistory(data SendRequestData, resp *HTTPResponseData) {
	// 保存响应
	if data.EndpointID != "" {
		response := &models.Response{
			EndpointID:    data.EndpointID,
			StatusCode:    resp.StatusCode,
			Headers:       models.ToJSON(resp.Headers),
			Body:          resp.Body,
			ContentType:   resp.ContentType,
			Cookies:       models.ToJSON(resp.Cookies),
			Timing:        models.ToJSON(resp.Timing),
			Size:          resp.Size,
			ActualRequest: models.ToJSON(resp.ActualRequest),
		}
		endpointService := NewEndpointService(s.db)
		if err := endpointService.SaveResponse(data.EndpointID, response); err != nil {
			slog.Error("保存响应失败", "error", err)
		}
	}

	// 保存请求历史
	if data.ModuleID != "" {
		// 构建请求头
		reqHeaders := make(map[string]string)
		for _, h := range data.Headers {
			if h.Enabled {
				reqHeaders[h.Name] = h.Value
			}
		}

		history := &models.RequestHistory{
			ModuleID:        data.ModuleID,
			EndpointID:      nilOrNilString(data.EndpointID),
			Method:          data.Method,
			URL:             combineURL(data.BaseURL, data.Path),
			StatusCode:      resp.StatusCode,
			Timing:          models.ToJSON(resp.Timing),
			Size:            resp.Size,
			RequestHeaders:  models.ToJSON(reqHeaders),
			RequestBody:     data.BodyContent,
			ResponseHeaders: models.ToJSON(resp.Headers),
			ResponseBody:    resp.Body,
			ContentType:     resp.ContentType,
		}
		if err := s.db.Create(history).Error; err != nil {
			slog.Error("保存请求历史失败", "error", err)
		}
	}
}

// parseFileField 解析文件字段的 value（前端约定为 {"fileName":..,"content":<base64>} JSON）
func parseFileField(value string) (fileName string, content []byte, ok bool) {
	var payload struct {
		FileName string `json:"fileName"`
		Content  string `json:"content"`
	}
	if err := json.Unmarshal([]byte(value), &payload); err != nil {
		return "", nil, false
	}
	decoded, err := base64.StdEncoding.DecodeString(payload.Content)
	if err != nil {
		return "", nil, false
	}
	return payload.FileName, decoded, true
}

// resolveVars 替换字符串中的 {{key}} 占位符；多趟替换以支持一层嵌套。
func resolveVars(input string, vars map[string]string) string {
	result := input
	for i := 0; i < 5 && strings.Contains(result, "{{"); i++ {
		prev := result
		for k, v := range vars {
			result = strings.ReplaceAll(result, "{{"+k+"}}", v)
		}
		if result == prev {
			break
		}
	}
	return result
}

// enabledHeaders 将启用的端点请求头转换为脚本 Header 列表。
func enabledHeaders(headers []models.EndpointHeader) []scripting.Header {
	out := make([]scripting.Header, 0, len(headers))
	for _, h := range headers {
		if h.Enabled {
			out = append(out, scripting.Header{Key: h.Name, Value: h.Value})
		}
	}
	return out
}

// headersToModel 将脚本 Header 列表转换回端点请求头（均标记为启用）。
func headersToModel(headers []scripting.Header) []models.EndpointHeader {
	out := make([]models.EndpointHeader, 0, len(headers))
	for _, h := range headers {
		out = append(out, models.EndpointHeader{Name: h.Key, Value: h.Value, Enabled: true})
	}
	return out
}

// flattenToHeaders 将 http.Header 转换为脚本 Header 列表（多值以逗号连接）。
func flattenToHeaders(h http.Header) []scripting.Header {
	out := make([]scripting.Header, 0, len(h))
	for k, v := range h {
		out = append(out, scripting.Header{Key: k, Value: strings.Join(v, ", ")})
	}
	return out
}

// headersToHTTPHeader 将脚本 Header 列表转换回 http.Header。
func headersToHTTPHeader(headers []scripting.Header) http.Header {
	out := http.Header{}
	for _, h := range headers {
		out.Set(h.Key, h.Value)
	}
	return out
}

// combineURL 组合基础 URL 和路径
func combineURL(baseURL, path string) string {
	if baseURL == "" {
		return path
	}
	baseURL = strings.TrimRight(baseURL, "/")
	path = strings.TrimLeft(path, "/")
	return baseURL + "/" + path
}

// flattenHeaders 将 http.Header 转换为 map[string]string
func flattenHeaders(h http.Header) map[string]string {
	result := make(map[string]string)
	for k, v := range h {
		result[k] = strings.Join(v, ", ")
	}
	return result
}

// SameSite 字符串表示
func sameSiteString(s http.SameSite) string {
	switch s {
	case http.SameSiteLaxMode:
		return "Lax"
	case http.SameSiteStrictMode:
		return "Strict"
	case http.SameSiteDefaultMode:
		return "Default"
	default:
		return "None"
	}
}

// parseCookies 解析 Cookie 列表
func parseCookies(cookies []*http.Cookie) []models.CookieInfo {
	result := make([]models.CookieInfo, 0, len(cookies))
	for _, c := range cookies {
		result = append(result, models.CookieInfo{
			Name:     c.Name,
			Value:    c.Value,
			Domain:   c.Domain,
			Path:     c.Path,
			Expires:  c.Expires.Format(time.RFC1123),
			HTTPOnly: c.HttpOnly,
			Secure:   c.Secure,
			SameSite: sameSiteString(c.SameSite),
		})
	}
	return result
}

// nilOrNilString 将空字符串转为 nil
func nilOrNilString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// httptraceCollector 收集 HTTP 请求计时信息
type httptraceCollector struct {
	dnsStart, dnsEnd         *time.Time
	tlsStart, tlsEnd         *time.Time
	connectStart, connectEnd *time.Time
	gotFirstByte             *time.Time
}

func (t *httptraceCollector) attach(ctx context.Context) context.Context {
	// 安装 httptrace 钩子，记录各阶段时间点，用于计算 DNS/TCP/TLS/TTFB 分解
	trace := &httptrace.ClientTrace{
		DNSStart: func(httptrace.DNSStartInfo) { *t.dnsStart = time.Now() },
		DNSDone:  func(httptrace.DNSDoneInfo) { *t.dnsEnd = time.Now() },
		ConnectStart: func(_, _ string) {
			// 可能多次回调（IPv4/IPv6），仅记录第一次
			if t.connectStart.IsZero() {
				*t.connectStart = time.Now()
			}
		},
		ConnectDone:          func(_, _ string, _ error) { *t.connectEnd = time.Now() },
		TLSHandshakeStart:    func() { *t.tlsStart = time.Now() },
		TLSHandshakeDone:     func(tls.ConnectionState, error) { *t.tlsEnd = time.Now() },
		GotFirstResponseByte: func() { *t.gotFirstByte = time.Now() },
	}
	return httptrace.WithClientTrace(ctx, trace)
}

// DumpRequest 导出请求信息（用于调试）
func DumpRequest(req *http.Request) (string, error) {
	dump, err := httputil.DumpRequestOut(req, true)
	if err != nil {
		return "", err
	}
	return string(dump), nil
}
