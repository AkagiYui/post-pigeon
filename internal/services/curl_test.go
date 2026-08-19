package services

import (
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestParseCurlBasic(t *testing.T) {
	svc := NewCurlService(nil)
	req, err := svc.ParseCurl(`curl 'https://api.example.com/users?page=2' -H 'Accept: application/json'`)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if req.Method != "GET" {
		t.Errorf("Method=%q", req.Method)
	}
	if req.URL != "https://api.example.com/users" {
		t.Errorf("URL=%q（查询参数应拆到 Params）", req.URL)
	}
	if len(req.Params) != 1 || req.Params[0].Name != "page" || req.Params[0].Value != "2" {
		t.Errorf("Params=%+v", req.Params)
	}
	if len(req.Headers) != 1 || req.Headers[0].Name != "Accept" {
		t.Errorf("Headers=%+v", req.Headers)
	}
}

func TestParseCurlDevToolsStyle(t *testing.T) {
	// Chrome DevTools「Copy as cURL」的典型形态：多行续行 + 单引号 + --data-raw
	command := `curl 'https://api.example.com/login' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer tok-123' \
  -b 'sid=abc; theme=dark' \
  --data-raw '{"user":"alice","pwd":"p@ss"}' \
  --compressed`

	svc := NewCurlService(nil)
	req, err := svc.ParseCurl(command)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if req.Method != "POST" {
		t.Errorf("有请求体且未指定方法时应推断为 POST，实际 %q", req.Method)
	}
	if req.BodyType != string(models.BodyTypeJSON) {
		t.Errorf("BodyType=%q", req.BodyType)
	}
	if !strings.Contains(req.BodyContent, `"user":"alice"`) {
		t.Errorf("BodyContent=%q", req.BodyContent)
	}
	if req.Auth == nil || req.Auth.Type != string(models.AuthTypeBearer) {
		t.Fatalf("Authorization: Bearer 应提升为 bearer 认证，实际 %+v", req.Auth)
	}
	var bearer models.BearerAuthData
	_ = models.FromJSON(req.Auth.Data, &bearer)
	if bearer.Token != "tok-123" {
		t.Errorf("Token=%q", bearer.Token)
	}
	// 提升后不应再留在请求头里
	for _, h := range req.Headers {
		if strings.EqualFold(h.Name, "Authorization") {
			t.Errorf("Authorization 头应已被移除")
		}
	}
	// Cookie 拆成两个 cookie 参数
	cookies := 0
	for _, p := range req.Params {
		if p.Type == "cookie" {
			cookies++
		}
	}
	if cookies != 2 {
		t.Errorf("应解析出 2 个 cookie 参数，实际 %d", cookies)
	}
}

func TestParseCurlFormAndFlags(t *testing.T) {
	svc := NewCurlService(nil)
	req, err := svc.ParseCurl(`curl -X PUT https://x.com/upload -F name=alice -F avatar=@a.png -u admin:secret -L -k -m 5`)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if req.Method != "PUT" {
		t.Errorf("Method=%q", req.Method)
	}
	if req.BodyType != string(models.BodyTypeFormData) || len(req.BodyFields) != 2 {
		t.Fatalf("BodyType=%q fields=%+v", req.BodyType, req.BodyFields)
	}
	if req.BodyFields[1].FieldType != "file" || req.BodyFields[1].Value != "a.png" {
		t.Errorf("文件字段解析有误：%+v", req.BodyFields[1])
	}
	if req.Auth == nil || req.Auth.Type != string(models.AuthTypeBasic) {
		t.Fatalf("-u 应解析为 basic 认证，实际 %+v", req.Auth)
	}
	if !req.FollowRedirects || !req.Insecure {
		t.Errorf("-L/-k 应被识别：follow=%v insecure=%v", req.FollowRedirects, req.Insecure)
	}
	if req.TimeoutMs != 5000 {
		t.Errorf("-m 5 应换算为 5000ms，实际 %d", req.TimeoutMs)
	}
}

func TestParseCurlURLEncodedAndGetFlag(t *testing.T) {
	svc := NewCurlService(nil)

	form, err := svc.ParseCurl(`curl https://x.com/f -H 'Content-Type: application/x-www-form-urlencoded' -d 'a=1&b=2'`)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if form.BodyType != string(models.BodyTypeURLEncoded) || len(form.BodyFields) != 2 {
		t.Errorf("BodyType=%q fields=%+v", form.BodyType, form.BodyFields)
	}

	// -G 把数据拼到查询串而非请求体
	get, err := svc.ParseCurl(`curl -G https://x.com/s -d 'q=go' -d 'lang=zh'`)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if get.BodyType != string(models.BodyTypeNone) {
		t.Errorf("-G 时不应产生请求体，实际 %q", get.BodyType)
	}
	if len(get.Params) != 2 {
		t.Errorf("-G 的数据应变成查询参数，实际 %+v", get.Params)
	}
}

func TestParseCurlErrors(t *testing.T) {
	svc := NewCurlService(nil)
	if _, err := svc.ParseCurl("curl -X GET"); err == nil {
		t.Errorf("没有 URL 应报错")
	}
	if _, err := svc.ParseCurl(`curl 'https://x.com`); err == nil {
		t.Errorf("引号未闭合应报错")
	}
	if _, err := svc.ParseCurl(""); err == nil {
		t.Errorf("空命令应报错")
	}
}

func TestParseCurlIgnoresValuedUnsupportedFlags(t *testing.T) {
	// -o 的值不能被当成 URL
	svc := NewCurlService(nil)
	req, err := svc.ParseCurl(`curl -o out.json https://x.com/api`)
	if err != nil {
		t.Fatalf("ParseCurl err=%v", err)
	}
	if req.URL != "https://x.com/api" {
		t.Errorf("URL=%q", req.URL)
	}
}

func TestToCurlRoundTrip(t *testing.T) {
	svc := NewCurlService(nil)
	command, err := svc.ToCurl(SendRequestData{
		Method:  "POST",
		BaseURL: "https://api.example.com",
		Path:    "/orders",
		Headers: []models.EndpointHeader{
			{Name: "X-Trace", Value: "abc", Enabled: true},
			{Name: "X-Off", Value: "no", Enabled: false},
		},
		Params: []models.EndpointParam{
			{Type: "query", Name: "dry", Value: "1", Enabled: true},
			{Type: "cookie", Name: "sid", Value: "s1", Enabled: true},
		},
		BodyType:        string(models.BodyTypeJSON),
		BodyContent:     `{"n":1}`,
		FollowRedirects: true,
		Timeout:         3000,
	})
	if err != nil {
		t.Fatalf("ToCurl err=%v", err)
	}

	for _, want := range []string{
		"curl -X POST",
		"https://api.example.com/orders?dry=1",
		"-H 'X-Trace: abc'",
		"-b 'sid=s1'",
		`--data-raw '{"n":1}'`,
		"-H 'Content-Type: application/json'",
		"-L",
		"--max-time 3",
	} {
		if !strings.Contains(command, want) {
			t.Errorf("导出的命令缺少 %q\n%s", want, command)
		}
	}
	if strings.Contains(command, "X-Off") {
		t.Errorf("未启用的请求头不应导出\n%s", command)
	}

	// 再解析回来，关键信息应一致
	back, err := svc.ParseCurl(command)
	if err != nil {
		t.Fatalf("回解析失败: %v", err)
	}
	if back.Method != "POST" || back.URL != "https://api.example.com/orders" {
		t.Errorf("回解析结果=%s %s", back.Method, back.URL)
	}
	if back.BodyContent != `{"n":1}` {
		t.Errorf("回解析请求体=%q", back.BodyContent)
	}
}

func TestShellQuoteEscapesSingleQuote(t *testing.T) {
	quoted := shellQuote(`it's`)
	if quoted != `'it'\''s'` {
		t.Fatalf("shellQuote=%s", quoted)
	}
	// 转义后应能被自己的分词器正确还原
	tokens, err := tokenizeShell(quoted)
	if err != nil {
		t.Fatalf("tokenize err=%v", err)
	}
	if len(tokens) != 1 || tokens[0] != `it's` {
		t.Errorf("tokens=%q", tokens)
	}
}
