package services

import (
	"fmt"
	"maps"
	"net/url"
	"sort"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// CurlService 负责请求与 cURL 命令之间的互转。
//
// 「复制为 cURL」和「粘贴 cURL 新建请求」是 API 调试里最高频的两个交换动作：
// 前者用于把调试好的请求贴进工单/文档/CI，后者用于把浏览器 DevTools 里
// 「Copy as cURL」出来的请求直接拿进来复现。
type CurlService struct {
	db *gorm.DB
}

// NewCurlService 创建 cURL 服务实例。
func NewCurlService(db *gorm.DB) *CurlService {
	return &CurlService{db: db}
}

// CurlRequest 是从 cURL 命令解析出的请求，字段与新建请求所需的信息对齐。
type CurlRequest struct {
	Method          string                     `json:"method"`
	URL             string                     `json:"url"`
	Headers         []models.EndpointHeader    `json:"headers"`
	Params          []models.EndpointParam     `json:"params"`
	BodyType        string                     `json:"bodyType"`
	BodyContent     string                     `json:"bodyContent"`
	ContentType     string                     `json:"contentType"`
	BodyFields      []models.EndpointBodyField `json:"bodyFields"`
	Auth            *models.EndpointAuth       `json:"auth"`
	FollowRedirects bool                       `json:"followRedirects"`
	// Insecure 对应 curl -k：解析结果里保留，前端可据此把接口 TLS 设为 insecure
	Insecure bool `json:"insecure"`
	// TimeoutMs 对应 curl -m（秒）换算的毫秒；未指定为 0
	TimeoutMs int `json:"timeoutMs"`
}

// ToCurl 把一次请求导出为可直接执行的 cURL 命令。
//
// 变量占位符会按当前环境解析成实际值——导出的命令就是为了「拿到别处直接跑」，
// 留着 {{token}} 反而不可用。
func (s *CurlService) ToCurl(data SendRequestData) (string, error) {
	vars := s.requestVars(data)
	requestEndpoint := endpointForRequest(s.db, data.EndpointID, data.ModuleID)
	requestPath := loadRequestScopePath(s.db, requestEndpoint)

	fullURL := resolveVars(combineURL(data.BaseURL, data.Path), vars)
	fullURL = applyPathParams(fullURL, data.Params, vars)

	parsed, err := url.Parse(fullURL)
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeInvalidURL, apperr.P("url", fullURL))
	}
	query := parsed.Query()
	for _, param := range data.Params {
		if param.Enabled && param.Type == "query" {
			query.Add(param.Name, resolveVars(param.Value, vars))
		}
	}

	// 导出的命令要和实际发送的请求一致，URL 自动编码档位也得按同一条链解析
	epEncoding := data.URLEncoding
	if strings.TrimSpace(epEncoding) == "" {
		epEncoding = savedEndpointURLEncoding(s.db, data.EndpointID)
	}
	urlEncoding := resolveURLEncodingFromPath(s.db, requestPath, epEncoding)
	applyURLEncoding(parsed, query, urlEncoding)

	method := strings.ToUpper(strings.TrimSpace(data.Method))
	if method == "" {
		method = "GET"
	}

	// 每个参数单独一行、以 \ 续行，长命令仍然可读
	lines := []string{fmt.Sprintf("curl -X %s %s", method, shellQuote(urlWithHost(parsed)))}

	// 重定向、超时和 no-cache 与实际发送共用同一条五级继承链。
	limits := models.DefaultRequestSettings
	if s.db != nil {
		limits = getRequestSettings(s.db)
	}
	if resolveFollowRedirects(requestPath, data.FollowRedirects, limits.FollowRedirects) {
		lines = append(lines, "-L")
	}
	if timeout := resolveRequestTimeout(requestPath, data.TimeoutMode, data.Timeout, limits); timeout > 0 {
		lines = append(lines, fmt.Sprintf("--max-time %g", timeout.Seconds()))
	}

	// 请求头：按名称排序，保证同一请求每次导出的命令一致（便于 diff）
	headers := make([]models.EndpointHeader, 0, len(data.Headers))
	for _, h := range data.Headers {
		if h.Enabled && strings.TrimSpace(h.Name) != "" {
			headers = append(headers, h)
		}
	}
	if resolveSendNoCacheHeaders(requestPath, data.SendNoCacheHeaders, limits.SendNoCacheHeaders) && !hasHeader(headers, "Cache-Control") {
		headers = append(headers, models.EndpointHeader{Name: "Cache-Control", Value: "no-cache", Enabled: true})
	}
	sort.SliceStable(headers, func(i, j int) bool { return headers[i].Name < headers[j].Name })
	for _, h := range headers {
		lines = append(lines, fmt.Sprintf("-H %s", shellQuote(h.Name+": "+resolveVars(h.Value, vars))))
	}

	// Cookie 参数合并为一个 -b
	var cookies []string
	for _, param := range data.Params {
		if param.Enabled && param.Type == "cookie" {
			cookies = append(cookies, param.Name+"="+resolveVars(param.Value, vars))
		}
	}
	if len(cookies) > 0 {
		lines = append(lines, fmt.Sprintf("-b %s", shellQuote(strings.Join(cookies, "; "))))
	}

	// 认证
	if auth := data.Auth; auth != nil {
		switch auth.Type {
		case string(models.AuthTypeBasic):
			var basic models.BasicAuthData
			if err := models.FromJSON(auth.Data, &basic); err == nil {
				lines = append(lines, fmt.Sprintf("-u %s", shellQuote(resolveVars(basic.Username, vars)+":"+resolveVars(basic.Password, vars))))
			}
		case string(models.AuthTypeBearer):
			var bearer models.BearerAuthData
			if err := models.FromJSON(auth.Data, &bearer); err == nil {
				lines = append(lines, fmt.Sprintf("-H %s", shellQuote("Authorization: Bearer "+resolveVars(bearer.Token, vars))))
			}
		case string(models.AuthTypeAPIKey):
			var apiKey models.APIKeyAuthData
			if err := models.FromJSON(auth.Data, &apiKey); err == nil && apiKey.Key != "" {
				value := resolveVars(apiKey.Value, vars)
				switch apiKey.In {
				case "query":
					// 查询参数形式的 API Key 直接并进 URL
					q := parsed.Query()
					q.Set(apiKey.Key, value)
					parsed.RawQuery = encodeQueryValues(q, urlEncoding)
					lines[0] = fmt.Sprintf("curl -X %s %s", method, shellQuote(urlWithHost(parsed)))
				case "cookie":
					lines = append(lines, fmt.Sprintf("-b %s", shellQuote(apiKey.Key+"="+value)))
				default:
					lines = append(lines, fmt.Sprintf("-H %s", shellQuote(apiKey.Key+": "+value)))
				}
			}
		}
	}

	// 请求体
	lines = append(lines, curlBodyArgs(data, vars, limits)...)

	return strings.Join(lines, " \\\n  "), nil
}

// requestVars 汇总该请求可用的变量（全局变量 + 模块变量 + 环境变量），与发送时的解析口径一致。
func (s *CurlService) requestVars(data SendRequestData) map[string]string {
	vars := map[string]string{}
	if s.db == nil {
		return vars
	}
	httpSvc := NewHTTPService(s.db)
	maps.Copy(vars, httpSvc.loadGlobalVars(data.ModuleID))
	maps.Copy(vars, httpSvc.loadModuleVars(data.ModuleID))
	if data.EnvironmentID != "" {
		if list, err := NewEnvironmentService(s.db).GetEnvironmentVariables(data.EnvironmentID); err == nil {
			for _, item := range list {
				if item.Enabled {
					vars[item.Key] = item.Value
				}
			}
		}
	}
	return vars
}

// curlBodyArgs 把请求体转成对应的 curl 参数。
func curlBodyArgs(data SendRequestData, vars map[string]string, limits models.RequestSettings) []string {
	switch data.BodyType {
	case string(models.BodyTypeGraphQL):
		payload, err := buildGraphQLBody(resolveVars(data.BodyContent, vars), limits.AllowJSONComments)
		if err != nil {
			return nil
		}
		args := []string{fmt.Sprintf("--data-raw %s", shellQuote(string(payload)))}
		if !hasHeader(data.Headers, "Content-Type") {
			args = append(args, fmt.Sprintf("-H %s", shellQuote("Content-Type: "+defaultStr(data.ContentType, "application/json"))))
		}
		return args

	case string(models.BodyTypeJSON), string(models.BodyTypeText), string(models.BodyTypeXML):
		body := resolveVars(data.BodyContent, vars)
		if data.BodyType == string(models.BodyTypeJSON) {
			// 导出的命令要能直接跑，注释得和真正发送时一样去掉
			body = normalizeJSONCIf(limits.AllowJSONComments, body)
		}
		if body == "" {
			return nil
		}
		args := []string{fmt.Sprintf("--data-raw %s", shellQuote(body))}
		if !hasHeader(data.Headers, "Content-Type") {
			args = append(args, fmt.Sprintf("-H %s", shellQuote("Content-Type: "+defaultContentType(data))))
		}
		return args

	case string(models.BodyTypeURLEncoded):
		var args []string
		for _, field := range data.BodyFields {
			if field.Enabled {
				for _, serialized := range serializeURLEncodedBodyField(field, vars) {
					args = append(args, fmt.Sprintf("--data-urlencode %s", shellQuote(serialized.Name+"="+serialized.Value)))
				}
			}
		}
		return args

	case string(models.BodyTypeFormData):
		var args []string
		for _, field := range data.BodyFields {
			if !field.Enabled {
				continue
			}
			if bodyFieldDataType(field) == "file" {
				// curl 用 @路径 引用本地文件。现在库里存的就是路径，导出的命令可以直接跑；
				// 历史数据只有内联内容时退回文件名占位，让用户自己补上路径
				files, ok := parseFileFields(field.Value)
				if !ok {
					files = []fileFieldValue{{FileName: field.Value}}
				}
				for _, file := range files {
					ref := file.Path
					if ref == "" {
						ref = file.displayName()
					}
					value := field.Name + "=@" + ref
					if field.ContentType != "" {
						value += ";type=" + resolveVars(field.ContentType, vars)
					}
					args = append(args, fmt.Sprintf("-F %s", shellQuote(value)))
				}
			} else {
				for _, serialized := range serializeFormBodyField(field, vars) {
					value := serialized.Name + "=" + serialized.Value
					if field.ContentType != "" {
						value += ";type=" + resolveVars(field.ContentType, vars)
					}
					args = append(args, fmt.Sprintf("-F %s", shellQuote(value)))
				}
			}
		}
		return args

	case string(models.BodyTypeBinary):
		file, ok := parseFileField(data.BodyContent)
		if !ok {
			return nil
		}
		ref := file.Path
		if ref == "" {
			ref = file.displayName()
		}
		return []string{fmt.Sprintf("--data-binary %s", shellQuote("@"+ref))}
	}
	return nil
}

// defaultContentType 返回请求体类型对应的默认 Content-Type。
func defaultContentType(data SendRequestData) string {
	if strings.TrimSpace(data.ContentType) != "" {
		return data.ContentType
	}
	switch data.BodyType {
	case string(models.BodyTypeJSON):
		return "application/json"
	case string(models.BodyTypeXML):
		return "application/xml"
	default:
		return "text/plain"
	}
}

// hasHeader 判断请求头列表中是否已有指定名称的启用项（大小写不敏感）。
func hasHeader(headers []models.EndpointHeader, name string) bool {
	for _, h := range headers {
		if h.Enabled && strings.EqualFold(h.Name, name) {
			return true
		}
	}
	return false
}

// shellQuote 用单引号包裹参数，内部单引号按 POSIX shell 规则转义。
func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}
