package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httputil"
	"net/url"
	"post-pigeon/internal/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

// HTTPService HTTP 请求服务
type HTTPService struct {
	db *gorm.DB
}

// NewHTTPService 创建 HTTP 服务实例
func NewHTTPService(db *gorm.DB) *HTTPService {
	return &HTTPService{db: db}
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
}

// HTTPResponseData HTTP 响应数据
type HTTPResponseData struct {
	StatusCode    int                      `json:"statusCode"`
	Headers       map[string][]string      `json:"headers"`
	Body          string                   `json:"body"`
	ContentType   string                   `json:"contentType"`
	Cookies       []models.CookieInfo      `json:"cookies"`
	Timing        models.TimingInfo        `json:"timing"`
	Size          int64                    `json:"size"`
	ActualRequest models.ActualRequestInfo `json:"actualRequest"`
}

// SendRequest 发送 HTTP 请求
func (s *HTTPService) SendRequest(data SendRequestData) (*HTTPResponseData, error) {
	// 解析环境变量
	envService := NewEnvironmentService(s.db)
	resolvedPath, err := envService.ResolveVariables(data.EnvironmentID, data.Path)
	if err != nil {
		slog.Warn("解析环境变量失败，使用原始路径", "error", err)
		resolvedPath = data.Path
	}

	// 组合 URL
	fullURL := combineURL(data.BaseURL, resolvedPath)

	// 解析 URL 中的查询参数
	parsedURL, err := url.Parse(fullURL)
	if err != nil {
		return nil, fmt.Errorf("无效的URL: %w", err)
	}

	// 添加查询参数
	query := parsedURL.Query()
	for _, param := range data.Params {
		if param.Enabled && param.Type == "query" {
			resolvedValue, _ := envService.ResolveVariables(data.EnvironmentID, param.Value)
			query.Add(param.Name, resolvedValue)
		}
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
			resolvedValue, _ := envService.ResolveVariables(data.EnvironmentID, header.Value)
			req.Header.Set(header.Name, resolvedValue)
		}
	}

	// 设置请求体
	if err := s.setRequestBody(req, data, envService); err != nil {
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
		ContentType:   resp.Header.Get("Content-Type"),
		Cookies:       cookies,
		Timing:        timing,
		Size:          int64(len(bodyBytes)),
		ActualRequest: actualReq,
	}

	// 异步保存响应和请求历史
	go s.saveResponseAndHistory(data, responseData)

	return responseData, nil
}

// setRequestBody 设置请求体
func (s *HTTPService) setRequestBody(req *http.Request, data SendRequestData, envService *EnvironmentService) error {
	switch data.BodyType {
	case string(models.BodyTypeNone):
		// 无请求体
		return nil

	case string(models.BodyTypeJSON), string(models.BodyTypeText):
		// JSON 或纯文本
		resolvedContent, _ := envService.ResolveVariables(data.EnvironmentID, data.BodyContent)
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
		// multipart/form-data
		var buf strings.Builder
		boundary := fmt.Sprintf("----PostPigeonBoundary%d", time.Now().UnixNano())
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			resolvedValue, _ := envService.ResolveVariables(data.EnvironmentID, field.Value)
			buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
			if field.FieldType == "file" {
				buf.WriteString(fmt.Sprintf("Content-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n\r\n", field.Name, resolvedValue))
			} else {
				buf.WriteString(fmt.Sprintf("Content-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n", field.Name, resolvedValue))
			}
		}
		buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
		body := buf.String()
		req.Body = io.NopCloser(strings.NewReader(body))
		req.GetBody = func() (io.ReadCloser, error) {
			return io.NopCloser(strings.NewReader(body)), nil
		}
		req.ContentLength = int64(len(body))
		req.Header.Set("Content-Type", fmt.Sprintf("multipart/form-data; boundary=%s", boundary))

	case string(models.BodyTypeURLEncoded):
		// application/x-www-form-urlencoded
		values := url.Values{}
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			resolvedValue, _ := envService.ResolveVariables(data.EnvironmentID, field.Value)
			values.Set(field.Name, resolvedValue)
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
		history := &models.RequestHistory{
			ModuleID:   data.ModuleID,
			EndpointID: nilOrNilString(data.EndpointID),
			Method:     data.Method,
			URL:        combineURL(data.BaseURL, data.Path),
			StatusCode: resp.StatusCode,
			Timing:     models.ToJSON(resp.Timing),
			Size:       resp.Size,
		}
		if err := s.db.Create(history).Error; err != nil {
			slog.Error("保存请求历史失败", "error", err)
		}
	}
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
	// 使用 net/http/httptrace 进行计时
	// 注意：这里简化实现，使用基本的计时
	return ctx
}

// DumpRequest 导出请求信息（用于调试）
func DumpRequest(req *http.Request) (string, error) {
	dump, err := httputil.DumpRequestOut(req, true)
	if err != nil {
		return "", err
	}
	return string(dump), nil
}
