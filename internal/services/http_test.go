package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"PostPigeon/internal/models"
)

// echoServer 回显请求信息的测试服务器
func echoServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		hdr := map[string]string{}
		for k := range r.Header {
			hdr[k] = r.Header.Get(k)
		}
		res := map[string]any{
			"method":      r.Method,
			"path":        r.URL.Path,
			"query":       r.URL.Query(),
			"contentType": r.Header.Get("Content-Type"),
			"auth":        r.Header.Get("Authorization"),
			"headers":     hdr,
			"body":        string(body),
		}
		http.SetCookie(w, &http.Cookie{Name: "sid", Value: "abc123", Path: "/"})
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(res)
	})
	mux.HandleFunc("/redirect", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/echo", http.StatusFound)
	})
	mux.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		// 阻塞直到客户端取消（超时）
		<-r.Context().Done()
	})
	mux.HandleFunc("/ttfb", func(w http.ResponseWriter, r *http.Request) {
		// 延迟首字节，用于验证 TTFB 计时
		time.Sleep(60 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		// 解析 multipart，回显文本字段与文件内容，用于验证文件上传
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		fields := map[string]string{}
		for k, v := range r.MultipartForm.Value {
			if len(v) > 0 {
				fields[k] = v[0]
			}
		}
		files := map[string]map[string]string{}
		for k, fhs := range r.MultipartForm.File {
			if len(fhs) > 0 {
				f, _ := fhs[0].Open()
				b, _ := io.ReadAll(f)
				_ = f.Close()
				files[k] = map[string]string{"filename": fhs[0].Filename, "content": string(b)}
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"fields": fields, "files": files})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// decodeEcho 解析回显响应体
func decodeEcho(t *testing.T, body string) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal([]byte(body), &m); err != nil {
		t.Fatalf("解析回显响应失败: %v\n响应: %s", err, body)
	}
	return m
}

func TestHTTP_GET(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
	})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("状态码 = %d，期望 200", resp.StatusCode)
	}
	if resp.ContentType != "application/json" {
		t.Errorf("ContentType = %q", resp.ContentType)
	}
	if resp.Size <= 0 {
		t.Errorf("Size = %d，期望 >0", resp.Size)
	}
	if resp.Timing.Total < 0 {
		t.Errorf("Timing.Total = %g", resp.Timing.Total)
	}
	echo := decodeEcho(t, resp.Body)
	if echo["method"] != "GET" {
		t.Errorf("回显 method = %v", echo["method"])
	}
	// Cookie 解析
	if len(resp.Cookies) != 1 || resp.Cookies[0].Name != "sid" || resp.Cookies[0].Value != "abc123" {
		t.Errorf("Cookie 解析 = %+v", resp.Cookies)
	}
	// 实际请求信息
	if resp.ActualRequest.Method != "GET" || !strings.Contains(resp.ActualRequest.URL, "/echo") {
		t.Errorf("ActualRequest = %+v", resp.ActualRequest)
	}
}

func TestHTTP_SSEStreaming(t *testing.T) {
	db := newTestDB(t)
	// 返回 text/event-stream 的服务器
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		if fl, ok := w.(http.Flusher); ok {
			for i := 0; i < 3; i++ {
				fmt.Fprintf(w, "data: msg%d\n\n", i)
				fl.Flush()
			}
		}
	}))
	defer srv.Close()

	hs := NewHTTPService(db, NewSSEService())
	resp, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/sse"})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	if !resp.Streaming {
		t.Errorf("SSE 响应应标记为流式")
	}
	if resp.StreamID == "" {
		t.Errorf("应返回 StreamID")
	}
	if resp.StatusCode != 200 {
		t.Errorf("状态码=%d", resp.StatusCode)
	}
	if !strings.Contains(resp.ContentType, "text/event-stream") {
		t.Errorf("ContentType=%q", resp.ContentType)
	}
}

func TestHTTP_QueryParams(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
		Params: []models.EndpointParam{
			{Type: "query", Name: "a", Value: "1", Enabled: true},
			{Type: "query", Name: "b", Value: "2", Enabled: false}, // 禁用，不应发送
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	q, _ := echo["query"].(map[string]any)
	if q["a"] == nil {
		t.Errorf("查询参数 a 缺失: %v", q)
	}
	if q["b"] != nil {
		t.Errorf("禁用的查询参数 b 不应发送: %v", q)
	}
}

func TestHTTP_Headers(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
		Headers: []models.EndpointHeader{
			{Name: "X-Test", Value: "hello", Enabled: true},
			{Name: "X-Off", Value: "no", Enabled: false},
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	hdr, _ := echo["headers"].(map[string]any)
	if hdr["X-Test"] != "hello" {
		t.Errorf("X-Test 头 = %v", hdr["X-Test"])
	}
	if hdr["X-Off"] != nil {
		t.Errorf("禁用的头 X-Off 不应发送: %v", hdr["X-Off"])
	}
}

func TestHTTP_JSONBody(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType: "json", BodyContent: `{"k":"v"}`,
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	if echo["method"] != "POST" {
		t.Errorf("method = %v", echo["method"])
	}
	if !strings.Contains(echo["contentType"].(string), "application/json") {
		t.Errorf("Content-Type = %v", echo["contentType"])
	}
	if echo["body"] != `{"k":"v"}` {
		t.Errorf("请求体 = %v", echo["body"])
	}
}

func TestHTTP_FormData(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType: "form-data",
		BodyFields: []models.EndpointBodyField{
			{Name: "foo", Value: "bar", FieldType: "text", Enabled: true},
			{Name: "skip", Value: "x", FieldType: "text", Enabled: false},
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	ct, _ := echo["contentType"].(string)
	if !strings.HasPrefix(ct, "multipart/form-data") {
		t.Errorf("Content-Type = %q，期望 multipart/form-data", ct)
	}
	body, _ := echo["body"].(string)
	if !strings.Contains(body, `name="foo"`) || !strings.Contains(body, "bar") {
		t.Errorf("form-data 请求体未包含字段 foo=bar: %q", body)
	}
	if strings.Contains(body, `name="skip"`) {
		t.Errorf("禁用字段 skip 不应出现在请求体: %q", body)
	}
}

func TestHTTP_FormDataFileUpload(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	// 前端约定：文件字段 value = {"fileName":..,"content":<base64>}
	fileContent := "hello-file-内容"
	fileVal := `{"fileName":"a.txt","content":"` + base64.StdEncoding.EncodeToString([]byte(fileContent)) + `"}`

	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/upload",
		BodyType: "form-data",
		BodyFields: []models.EndpointBodyField{
			{Name: "text1", Value: "v1", FieldType: "text", Enabled: true},
			{Name: "upload", Value: fileVal, FieldType: "file", Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	fields, _ := echo["fields"].(map[string]any)
	if fields["text1"] != "v1" {
		t.Errorf("文本字段 text1 = %v，期望 v1", fields["text1"])
	}
	files, _ := echo["files"].(map[string]any)
	upload, _ := files["upload"].(map[string]any)
	if upload == nil {
		t.Fatalf("未收到上传文件，files=%v", files)
	}
	if upload["filename"] != "a.txt" {
		t.Errorf("文件名 = %v，期望 a.txt", upload["filename"])
	}
	if upload["content"] != fileContent {
		t.Errorf("文件内容 = %v，期望 %q", upload["content"], fileContent)
	}
}

func TestHTTP_URLEncoded(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType: "x-www-form-urlencoded",
		BodyFields: []models.EndpointBodyField{
			{Name: "foo", Value: "bar", Enabled: true},
			{Name: "baz", Value: "qux", Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	ct, _ := echo["contentType"].(string)
	if !strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		t.Errorf("Content-Type = %q", ct)
	}
	body, _ := echo["body"].(string)
	if !strings.Contains(body, "foo=bar") || !strings.Contains(body, "baz=qux") {
		t.Errorf("urlencoded 请求体 = %q", body)
	}
}

func TestHTTP_BasicAuth(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
		Auth: &models.EndpointAuth{Type: "basic", Data: models.ToJSON(models.BasicAuthData{Username: "user", Password: "pass"})},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	auth, _ := echo["auth"].(string)
	want := "Basic " + base64.StdEncoding.EncodeToString([]byte("user:pass"))
	if auth != want {
		t.Errorf("Basic 认证头 = %q，期望 %q", auth, want)
	}
}

func TestHTTP_BearerAuth(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
		Auth: &models.EndpointAuth{Type: "bearer", Data: models.ToJSON(models.BearerAuthData{Token: "tok123"})},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	if echo["auth"] != "Bearer tok123" {
		t.Errorf("Bearer 认证头 = %v", echo["auth"])
	}
}

func TestHTTP_EnvVarResolution(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)
	p := mustCreateProject(t, db, "P")
	es := NewEnvironmentService(db)
	env, _ := es.CreateEnvironment(p.ID, "Dev")
	if err := es.SaveEnvironmentVariables(env.ID, []models.EnvironmentVariable{
		{Key: "name", Value: "World", Enabled: true},
	}); err != nil {
		t.Fatalf("保存变量 err=%v", err)
	}

	resp, err := hs.SendRequest(SendRequestData{
		EnvironmentID: env.ID,
		Method:        "POST", BaseURL: srv.URL, Path: "/echo",
		Headers:  []models.EndpointHeader{{Name: "X-Greet", Value: "Hi-{{name}}", Enabled: true}},
		Params:   []models.EndpointParam{{Type: "query", Name: "who", Value: "{{name}}", Enabled: true}},
		BodyType: "json", BodyContent: `{"msg":"{{name}}"}`,
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	hdr, _ := echo["headers"].(map[string]any)
	if hdr["X-Greet"] != "Hi-World" {
		t.Errorf("头变量解析 = %v，期望 Hi-World", hdr["X-Greet"])
	}
	q, _ := echo["query"].(map[string]any)
	if arr, ok := q["who"].([]any); !ok || len(arr) == 0 || arr[0] != "World" {
		t.Errorf("查询变量解析 = %v，期望 World", q["who"])
	}
	if echo["body"] != `{"msg":"World"}` {
		t.Errorf("请求体变量解析 = %v，期望 {\"msg\":\"World\"}", echo["body"])
	}
}

func TestHTTP_RedirectFollow(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	// 跟随重定向 → 最终 200
	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/redirect", FollowRedirects: true,
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("跟随重定向状态码 = %d，期望 200", resp.StatusCode)
	}

	// 不跟随 → 返回 302
	resp, err = hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/redirect", FollowRedirects: false,
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if resp.StatusCode != 302 {
		t.Errorf("不跟随重定向状态码 = %d，期望 302", resp.StatusCode)
	}
}

func TestHTTP_Timeout(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	_, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/slow", Timeout: 100, // 100ms
	})
	if err == nil {
		t.Error("超时请求应返回错误，但成功了")
	}
}

func TestHTTP_SaveResponseAndHistory(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)
	p := mustCreateProject(t, db, "P")
	m := defaultModule(t, db, p.ID)
	es := NewEndpointService(db)
	e, _ := es.CreateEndpoint(m.ID, nil, "E", "GET", "/echo")

	_, err := hs.SendRequest(SendRequestData{
		EndpointID: e.ID, ModuleID: m.ID,
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}

	// 异步保存响应
	if !waitFor(func() bool {
		var c int64
		db.Model(&models.Response{}).Where("endpoint_id = ?", e.ID).Count(&c)
		return c == 1
	}) {
		t.Error("发送后未异步保存端点响应")
	}
	// 异步保存历史
	if !waitFor(func() bool {
		var c int64
		db.Model(&models.RequestHistory{}).Where("module_id = ?", m.ID).Count(&c)
		return c == 1
	}) {
		t.Error("发送后未异步保存请求历史")
	}
}

// TestHTTP_TimingBreakdown 验证 httptrace 计时分解已生效：
// 服务端延迟 60ms 才写首字节，TTFB 应明显 > 0（修复前 attach 为空操作，恒为 0）
func TestHTTP_TimingBreakdown(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := NewHTTPService(db, nil)

	resp, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/ttfb"})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	t.Logf("Timing: total=%g dns=%g tcp=%g tls=%g ttfb=%g",
		resp.Timing.Total, resp.Timing.DNSLookup, resp.Timing.TCPConnect, resp.Timing.TLSHandshake, resp.Timing.TTFB)
	if resp.Timing.TTFB <= 0 {
		t.Errorf("TTFB = %g，期望 > 0（httptrace 未生效）", resp.Timing.TTFB)
	}
	if resp.Timing.Total < resp.Timing.TTFB {
		t.Errorf("Total(%g) 不应小于 TTFB(%g)", resp.Timing.Total, resp.Timing.TTFB)
	}
}
