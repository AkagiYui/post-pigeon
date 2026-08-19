package services

import (
	"net/url"
	"strconv"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// 本文件解析 cURL 命令。主要来源是浏览器 DevTools 的「Copy as cURL」，
// 因此重点覆盖它会生成的形态：多行续行、单/双引号、$'...' 转义串、
// -H/-d/--data-raw/-b/-u/--compressed 等常见参数。

// ParseCurl 把一条 cURL 命令解析为可直接建请求的结构。
func (s *CurlService) ParseCurl(command string) (*CurlRequest, error) {
	tokens, err := tokenizeShell(command)
	if err != nil {
		return nil, err
	}
	if len(tokens) == 0 || !strings.EqualFold(strings.TrimSpace(tokens[0]), "curl") {
		// 允许不带 curl 前缀（有人只复制参数部分），但要求至少能找到一个 URL
		if len(tokens) == 0 {
			return nil, apperr.New(apperr.CodeImportParse, apperr.P("reason", "empty"))
		}
	} else {
		tokens = tokens[1:]
	}

	req := &CurlRequest{
		Method:     "",
		BodyType:   string(models.BodyTypeNone),
		Headers:    []models.EndpointHeader{},
		Params:     []models.EndpointParam{},
		BodyFields: []models.EndpointBodyField{},
	}

	var (
		rawURL      string
		dataParts   []string
		urlEncoded  []models.EndpointBodyField
		formFields  []models.EndpointBodyField
		cookiePairs []string
		basicUser   string
		forceGet    bool
	)

	// next 取下一个 token 作为参数值；缺失时返回空串
	next := func(i *int) string {
		if *i+1 < len(tokens) {
			*i++
			return tokens[*i]
		}
		return ""
	}

	for i := 0; i < len(tokens); i++ {
		token := tokens[i]
		switch {
		case token == "-X" || token == "--request":
			req.Method = strings.ToUpper(strings.TrimSpace(next(&i)))

		case token == "-H" || token == "--header":
			name, value, ok := splitHeader(next(&i))
			if !ok {
				continue
			}
			switch {
			case strings.EqualFold(name, "cookie"):
				cookiePairs = append(cookiePairs, value)
			case strings.EqualFold(name, "content-type"):
				req.ContentType = value
				req.Headers = append(req.Headers, models.EndpointHeader{Name: name, Value: value, Enabled: true})
			default:
				req.Headers = append(req.Headers, models.EndpointHeader{Name: name, Value: value, Enabled: true})
			}

		case token == "-d" || token == "--data" || token == "--data-raw" || token == "--data-binary" || token == "--data-ascii":
			dataParts = append(dataParts, next(&i))

		case token == "--data-urlencode":
			name, value, ok := splitOnce(next(&i), "=")
			if !ok {
				continue
			}
			urlEncoded = append(urlEncoded, models.EndpointBodyField{Name: name, Value: value, FieldType: "text", Enabled: true})

		case token == "-F" || token == "--form":
			name, value, ok := splitOnce(next(&i), "=")
			if !ok {
				continue
			}
			fieldType := "text"
			if strings.HasPrefix(value, "@") || strings.HasPrefix(value, "<") {
				// curl 用 @路径 引用本地文件；这里只保留文件名，内容需用户重新选择
				fieldType = "file"
				value = strings.TrimLeft(value, "@<")
			}
			formFields = append(formFields, models.EndpointBodyField{Name: name, Value: value, FieldType: fieldType, Enabled: true})

		case token == "-b" || token == "--cookie":
			cookiePairs = append(cookiePairs, next(&i))

		case token == "-u" || token == "--user":
			basicUser = next(&i)

		case token == "-A" || token == "--user-agent":
			req.Headers = append(req.Headers, models.EndpointHeader{Name: "User-Agent", Value: next(&i), Enabled: true})

		case token == "-e" || token == "--referer":
			req.Headers = append(req.Headers, models.EndpointHeader{Name: "Referer", Value: next(&i), Enabled: true})

		case token == "-L" || token == "--location":
			req.FollowRedirects = true

		case token == "-k" || token == "--insecure":
			req.Insecure = true

		case token == "-G" || token == "--get":
			forceGet = true

		case token == "-I" || token == "--head":
			req.Method = "HEAD"

		case token == "-m" || token == "--max-time" || token == "--connect-timeout":
			if seconds, err := strconv.ParseFloat(strings.TrimSpace(next(&i)), 64); err == nil && seconds > 0 {
				req.TimeoutMs = int(seconds * 1000)
			}

		case token == "--url":
			rawURL = next(&i)

		// 这些参数不影响请求语义，静默忽略
		case token == "--compressed" || token == "-s" || token == "--silent" || token == "-v" || token == "--verbose" ||
			token == "-i" || token == "--include" || token == "-f" || token == "--fail" || token == "-#" || token == "--progress-bar":

		// 带值但当前不支持的参数：吃掉它的值，避免被误当成 URL
		case token == "-o" || token == "--output" || token == "-x" || token == "--proxy" ||
			token == "--cacert" || token == "--cert" || token == "--key" || token == "-w" || token == "--write-out":
			next(&i)

		case strings.HasPrefix(token, "-"):
			// 未知短/长参数：形如 --foo=bar 的自带值，否则不吃下一个 token
			// （吃错会把 URL 当成参数值丢掉）

		default:
			if rawURL == "" {
				rawURL = token
			}
		}
	}

	if rawURL == "" {
		return nil, apperr.New(apperr.CodeImportParse, apperr.P("reason", "no-url"))
	}
	if !strings.Contains(rawURL, "://") {
		rawURL = "https://" + rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeInvalidURL, apperr.P("url", rawURL))
	}

	// 查询参数拆到 Params，URL 只保留 scheme://host/path
	for key, values := range parsed.Query() {
		for _, value := range values {
			req.Params = append(req.Params, models.EndpointParam{Type: "query", Name: key, Value: value, Enabled: true})
		}
	}
	parsed.RawQuery = ""
	req.URL = parsed.String()

	// Cookie 头拆成 cookie 参数
	for _, pairs := range cookiePairs {
		for _, pair := range strings.Split(pairs, ";") {
			name, value, ok := splitOnce(strings.TrimSpace(pair), "=")
			if ok && name != "" {
				req.Params = append(req.Params, models.EndpointParam{Type: "cookie", Name: name, Value: value, Enabled: true})
			}
		}
	}

	// Basic 认证
	if basicUser != "" {
		username, password, _ := splitOnce(basicUser, ":")
		req.Auth = &models.EndpointAuth{
			Type: string(models.AuthTypeBasic),
			Data: models.ToJSON(models.BasicAuthData{Username: username, Password: password}),
		}
	}
	// Authorization: Bearer 头提升为 bearer 认证，界面上更易编辑
	req.Headers = liftBearerAuth(req)

	// 请求体
	body := strings.Join(dataParts, "&")
	switch {
	case len(formFields) > 0:
		req.BodyType = string(models.BodyTypeFormData)
		req.BodyFields = formFields
	case len(urlEncoded) > 0:
		req.BodyType = string(models.BodyTypeURLEncoded)
		req.BodyFields = urlEncoded
	case body != "" && !forceGet:
		req.BodyType, req.BodyFields, req.BodyContent = classifyBody(body, req.ContentType)
	case body != "" && forceGet:
		// -G 把 --data 拼到查询串上而不是作为请求体
		for key, values := range parseQueryLoose(body) {
			for _, value := range values {
				req.Params = append(req.Params, models.EndpointParam{Type: "query", Name: key, Value: value, Enabled: true})
			}
		}
	}

	if req.Method == "" {
		if req.BodyType != string(models.BodyTypeNone) {
			req.Method = "POST"
		} else {
			req.Method = "GET"
		}
	}
	return req, nil
}

// classifyBody 依据 Content-Type 与内容推断请求体类型。
func classifyBody(body, contentType string) (string, []models.EndpointBodyField, string) {
	ct := strings.ToLower(contentType)
	switch {
	case strings.Contains(ct, "x-www-form-urlencoded"):
		fields := make([]models.EndpointBodyField, 0, 4)
		for key, values := range parseQueryLoose(body) {
			for _, value := range values {
				fields = append(fields, models.EndpointBodyField{Name: key, Value: value, FieldType: "text", Enabled: true})
			}
		}
		return string(models.BodyTypeURLEncoded), fields, ""
	case strings.Contains(ct, "json"):
		return string(models.BodyTypeJSON), nil, body
	case strings.Contains(ct, "xml"):
		return string(models.BodyTypeXML), nil, body
	case ct != "":
		return string(models.BodyTypeText), nil, body
	}
	// 没有 Content-Type：按内容猜一次，JSON 最常见
	trimmed := strings.TrimSpace(body)
	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		return string(models.BodyTypeJSON), nil, body
	}
	return string(models.BodyTypeText), nil, body
}

// parseQueryLoose 解析 a=1&b=2；解析失败时退化为按 & 和 = 手工切分。
func parseQueryLoose(s string) url.Values {
	if values, err := url.ParseQuery(s); err == nil {
		return values
	}
	values := url.Values{}
	for _, pair := range strings.Split(s, "&") {
		name, value, ok := splitOnce(pair, "=")
		if ok {
			values.Add(name, value)
		}
	}
	return values
}

// liftBearerAuth 把 Authorization: Bearer xxx 头提升为 bearer 认证并从头列表移除。
func liftBearerAuth(req *CurlRequest) []models.EndpointHeader {
	kept := make([]models.EndpointHeader, 0, len(req.Headers))
	for _, h := range req.Headers {
		if strings.EqualFold(h.Name, "Authorization") && strings.HasPrefix(strings.ToLower(h.Value), "bearer ") {
			if req.Auth == nil {
				req.Auth = &models.EndpointAuth{
					Type: string(models.AuthTypeBearer),
					Data: models.ToJSON(models.BearerAuthData{Token: strings.TrimSpace(h.Value[len("bearer "):])}),
				}
			}
			continue
		}
		kept = append(kept, h)
	}
	return kept
}

// splitHeader 把 "Name: value" 拆成键值。
func splitHeader(s string) (string, string, bool) {
	name, value, ok := splitOnce(s, ":")
	if !ok {
		return "", "", false
	}
	return strings.TrimSpace(name), strings.TrimSpace(value), true
}

// splitOnce 按首个 sep 切成两段。
func splitOnce(s, sep string) (string, string, bool) {
	idx := strings.Index(s, sep)
	if idx < 0 {
		return strings.TrimSpace(s), "", false
	}
	return s[:idx], s[idx+len(sep):], true
}

// tokenizeShell 按 POSIX shell 规则切分命令行：处理单引号、双引号、反斜杠转义、
// 反斜杠续行，以及 bash 的 $'...' 形式（DevTools 复制含控制字符的请求头时会用到）。
func tokenizeShell(input string) ([]string, error) {
	var (
		tokens  []string
		current strings.Builder
		started bool
	)
	flush := func() {
		if started {
			tokens = append(tokens, current.String())
			current.Reset()
			started = false
		}
	}

	runes := []rune(input)
	for i := 0; i < len(runes); i++ {
		c := runes[i]
		switch c {
		case ' ', '\t':
			flush()
		case '\r':
			// 忽略 CRLF 中的 CR
		case '\n':
			flush()
		case '^':
			// Windows cmd 的续行符：^ 后紧跟换行时整体跳过
			if i+1 < len(runes) && (runes[i+1] == '\n' || runes[i+1] == '\r') {
				continue
			}
			started = true
			current.WriteRune(c)
		case '\\':
			if i+1 >= len(runes) {
				started = true
				current.WriteRune(c)
				continue
			}
			nextRune := runes[i+1]
			if nextRune == '\n' || nextRune == '\r' {
				// 续行：吃掉反斜杠与换行
				i++
				if nextRune == '\r' && i+1 < len(runes) && runes[i+1] == '\n' {
					i++
				}
				continue
			}
			started = true
			current.WriteRune(nextRune)
			i++
		case '\'':
			started = true
			j := i + 1
			for j < len(runes) && runes[j] != '\'' {
				current.WriteRune(runes[j])
				j++
			}
			if j >= len(runes) {
				return nil, apperr.New(apperr.CodeImportParse, apperr.P("reason", "unclosed-quote"))
			}
			i = j
		case '"':
			started = true
			j := i + 1
			for j < len(runes) && runes[j] != '"' {
				if runes[j] == '\\' && j+1 < len(runes) {
					j++
					current.WriteRune(runes[j])
				} else {
					current.WriteRune(runes[j])
				}
				j++
			}
			if j >= len(runes) {
				return nil, apperr.New(apperr.CodeImportParse, apperr.P("reason", "unclosed-quote"))
			}
			i = j
		case '$':
			// bash 的 $'...'：按 C 风格转义解释内容
			if i+1 < len(runes) && runes[i+1] == '\'' {
				started = true
				j := i + 2
				for j < len(runes) && runes[j] != '\'' {
					if runes[j] == '\\' && j+1 < len(runes) {
						j++
						current.WriteRune(unescapeAnsiC(runes[j]))
					} else {
						current.WriteRune(runes[j])
					}
					j++
				}
				if j >= len(runes) {
					return nil, apperr.New(apperr.CodeImportParse, apperr.P("reason", "unclosed-quote"))
				}
				i = j
				continue
			}
			started = true
			current.WriteRune(c)
		default:
			started = true
			current.WriteRune(c)
		}
	}
	flush()
	return tokens, nil
}

// unescapeAnsiC 解释 $'...' 里的转义字符。
func unescapeAnsiC(c rune) rune {
	switch c {
	case 'n':
		return '\n'
	case 't':
		return '\t'
	case 'r':
		return '\r'
	case '0':
		return 0
	default:
		return c
	}
}
