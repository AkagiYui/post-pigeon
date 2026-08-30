package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"PostPigeon/internal/models"
	"gorm.io/gorm"
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
	return newTestServer(t, mux)
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

func TestParseSSEPreservesProtocolFields(t *testing.T) {
	input := "\ufeff: keep-alive\n" +
		"event: update\n" +
		"id: 42\n" +
		"retry: 1500\n" +
		"data:  leading space\n" +
		"data:second line\n\n" +
		"id: bad\x00id\n" +
		"data: final\n"
	var got []sseEvent
	err := parseSSE(strings.NewReader(input), sseReadLimits{}, func(event sseEvent) { got = append(got, event) })
	if err != nil {
		t.Fatalf("parseSSE err=%v", err)
	}
	if len(got) != 3 {
		t.Fatalf("event count=%d, want 3: %#v", len(got), got)
	}
	if !got[0].HasComment || got[0].Comment != "keep-alive" {
		t.Errorf("comment=%+v", got[0])
	}
	if event := got[1]; event.Event != "update" || event.EventID != "42" || !event.HasEventID ||
		!event.HasRetry || event.Retry != 1500 || event.Data != " leading space\nsecond line" {
		t.Errorf("first SSE event=%+v", event)
	}
	if event := got[2]; event.Event != "message" || event.HasEventID || event.Data != "final" {
		t.Errorf("final SSE event=%+v", event)
	}
}

func TestParseSSEHonorsResourceLimits(t *testing.T) {
	input := "data: abc\n\ndata: def\n\n"
	if err := parseSSE(strings.NewReader(input), sseReadLimits{MaxEventBytes: 6}, func(sseEvent) {}); err == nil || !strings.Contains(err.Error(), "event byte limit") {
		t.Fatalf("event byte limit err=%v", err)
	}
	if err := parseSSE(strings.NewReader(input), sseReadLimits{MaxTotalBytes: 10}, func(sseEvent) {}); err == nil || !strings.Contains(err.Error(), "stream byte limit") {
		t.Fatalf("stream byte limit err=%v", err)
	}
	if err := parseSSE(strings.NewReader(input), sseReadLimits{MaxEvents: 1}, func(sseEvent) {}); err == nil || !strings.Contains(err.Error(), "event limit") {
		t.Fatalf("event count limit err=%v", err)
	}
}

func TestStreamBodyTeePreservesRawBytes(t *testing.T) {
	input := []byte("data: \xe4\xb8\xad\r\n\r\n")
	var chunks [][]byte
	got, err := io.ReadAll(&streamBodyTee{reader: bytes.NewReader(input), emit: func(chunk []byte) {
		chunks = append(chunks, append([]byte(nil), chunk...))
	}})
	if err != nil || !bytes.Equal(got, input) || !bytes.Equal(bytes.Join(chunks, nil), input) {
		t.Fatalf("got=%q chunks=%q err=%v", got, bytes.Join(chunks, nil), err)
	}
}

func TestParseSSEEmitsReconnectControlFieldsWithoutData(t *testing.T) {
	var got []sseEvent
	err := parseSSE(strings.NewReader("id: cursor-3\nretry: 25\n\n"), sseReadLimits{}, func(event sseEvent) {
		got = append(got, event)
	})
	if err != nil || len(got) != 1 {
		t.Fatalf("events=%+v err=%v", got, err)
	}
	if !got[0].HasEventID || got[0].EventID != "cursor-3" || !got[0].HasRetry || got[0].Retry != 25 {
		t.Fatalf("reconnect control=%+v", got[0])
	}
}

func TestCloneSSEReconnectRequestCarriesLastEventIDAndBody(t *testing.T) {
	template, err := http.NewRequest(http.MethodPost, "https://example.test/events", strings.NewReader("request-body"))
	if err != nil {
		t.Fatal(err)
	}
	template.Header.Set("Last-Event-ID", "stale")
	next, err := cloneSSEReconnectRequest(template, context.Background(), "cursor-4", true)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(next.Body)
	if got := next.Header.Get("Last-Event-ID"); got != "cursor-4" || string(body) != "request-body" {
		t.Fatalf("last-event-id=%q body=%q", got, body)
	}
	withoutCursor, err := cloneSSEReconnectRequest(template, context.Background(), "", false)
	if err != nil || withoutCursor.Header.Get("Last-Event-ID") != "" {
		t.Fatalf("without cursor header=%q err=%v", withoutCursor.Header.Get("Last-Event-ID"), err)
	}
}

func TestStreamFormatsAndRecordParsing(t *testing.T) {
	if got := streamFormat("application/x-ndjson; charset=utf-8"); got != "ndjson" {
		t.Fatalf("NDJSON format=%q", got)
	}
	if got := streamFormat("application/json-seq"); got != "json-seq" {
		t.Fatalf("JSON sequence format=%q", got)
	}
	if got := streamFormat("application/octet-stream"); got != "" {
		t.Fatalf("binary download must not become a stream: %q", got)
	}
	var records []sseEvent
	err := parseRecordStream(strings.NewReader("{\"n\":1}\n\x1e{\"n\":2}\n"), sseReadLimits{}, true, func(event sseEvent) {
		records = append(records, event)
	})
	if err != nil || len(records) != 2 || records[1].Data != `{"n":2}` || records[1].Raw != "\x1e{\"n\":2}" {
		t.Fatalf("records=%+v err=%v", records, err)
	}
}

// TestSendRequestUsesCurrentEditorOverrides 验证已保存接口未点保存就直接发送时，
// 认证、模块参数开关、操作与继承开关均以当前编辑态为准，而不是数据库旧值。
func TestSendRequestUsesCurrentEditorOverrides(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "current-editor-overrides")
	module := defaultModule(t, db, project.ID)
	if err := NewScopeSettingsService(db).SaveModuleSettings(module.ID, ModuleSettings{
		AuthType: "bearer",
		AuthData: models.ToJSON(models.BearerAuthData{Token: "module-token"}),
		Params:   []models.ModuleParam{{Type: "query", Name: "trace", Value: "saved", Enabled: true}},
		Operations: []models.Operation{{
			Stage: "pre", Type: "script", Enabled: true,
			Data: models.ToJSON(models.ScriptOperationData{Script: `pm.request.headers.add({key:"X-Module",value:"old"});`}),
		}},
	}); err != nil {
		t.Fatalf("保存模块设置失败: %v", err)
	}

	es := NewEndpointService(db)
	ep, err := es.CreateEndpoint(module.ID, nil, "E", "GET", "/echo")
	if err != nil {
		t.Fatalf("创建接口失败: %v", err)
	}
	if err := es.SaveEndpointData(EndpointSaveData{
		ID: ep.ID, Name: ep.Name, Method: ep.Method, Path: ep.Path,
		DisabledGlobalParams: `["trace"]`, InheritOperations: true,
		Auth: &models.EndpointAuth{Type: "inherit"},
		Operations: []models.Operation{{
			Stage: "pre", Type: "script", Enabled: true,
			Data: models.ToJSON(models.ScriptOperationData{Script: `pm.request.headers.add({key:"X-Saved",value:"old"});`}),
		}},
	}); err != nil {
		t.Fatalf("保存接口旧配置失败: %v", err)
	}

	srv := echoServer(t)
	hs := newTestHTTPService(t, db)
	inheritOps := false
	resp, err := hs.SendRequest(SendRequestData{
		EndpointID: ep.ID, ModuleID: module.ID,
		Method: "GET", BaseURL: srv.URL, Path: "/echo",
		Auth:                 &models.EndpointAuth{Type: "none"},
		DisabledGlobalParams: `[]`,
		InheritOperations:    &inheritOps,
		Operations: []models.Operation{{
			Stage: "pre", Type: "script", Enabled: true,
			Data: models.ToJSON(models.ScriptOperationData{Script: `pm.request.headers.add({key:"X-Current",value:"yes"});`}),
		}},
	})
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	echo := decodeEcho(t, resp.Body)
	if echo["auth"] != "" {
		t.Errorf("当前 none 没有压住模块认证: auth=%v", echo["auth"])
	}
	query, _ := echo["query"].(map[string]any)
	if got := query["trace"]; got == nil {
		t.Errorf("当前启用的模块参数没有发送: query=%v", query)
	}
	headers, _ := echo["headers"].(map[string]any)
	if headers["X-Current"] != "yes" || headers["X-Saved"] != nil || headers["X-Module"] != nil {
		t.Errorf("操作没有按当前编辑态执行: headers=%v", headers)
	}
}

func TestHTTP_GET(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

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
	if resp.RequestRun == nil || resp.RequestRun.Outcome != models.RequestRunOutcomeCompleted || len(resp.RequestRun.Attempts) != 1 {
		t.Fatalf("请求执行链不完整: %+v", resp.RequestRun)
	}
	if resp.RequestRun.ConfiguredRequest == nil || resp.RequestRun.PreparedRequest == nil ||
		resp.RequestRun.ConfiguredRequest.CaptureLevel != "configured" || resp.RequestRun.PreparedRequest.CaptureLevel != "prepared" {
		t.Fatalf("请求三阶段快照不完整: %+v", resp.RequestRun)
	}
	if attempt := resp.RequestRun.Attempts[0]; attempt.Cause != models.RequestAttemptCauseInitial ||
		attempt.Response == nil || attempt.Response.StatusCode != http.StatusOK {
		t.Errorf("初始 attempt 不完整: %+v", attempt)
	}
}

func TestHTTP_SkippedRequestHasRunWithoutAttempt(t *testing.T) {
	db := newTestDB(t)
	var requests atomic.Int32
	srv := newTestServer(t, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { requests.Add(1) }))
	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/skip", BodyContent: `{"secret":"value"}`,
		PreRequestScript: `pm.execution.skipRequest();`,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !resp.Skipped || resp.RequestRun == nil || resp.RequestRun.Outcome != models.RequestRunOutcomeSkipped ||
		len(resp.RequestRun.Attempts) != 0 || resp.RequestRun.PreparedRequest == nil {
		t.Fatalf("跳过请求应保留 prepared 但没有 attempt: %+v", resp)
	}
	if requests.Load() != 0 {
		t.Fatalf("跳过请求不应进入网络层，实际 %d 次", requests.Load())
	}
}

func TestHTTP_SSEStreaming(t *testing.T) {
	db := newTestDB(t)
	// 返回 text/event-stream 的服务器
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		if fl, ok := w.(http.Flusher); ok {
			for i := range 3 {
				fmt.Fprintf(w, "data: msg%d\n\n", i)
				fl.Flush()
			}
		}
	}))

	hs := newTestHTTPService(t, db)
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

func TestHTTP_SSEReconnectPersistsAttemptChain(t *testing.T) {
	db := newTestDB(t)
	var requests atomic.Int32
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprint(w, "id: cursor\ndata: done\n\n")
	}))
	settings := models.DefaultRequestSettings
	settings.AutoReconnectSSE = true
	settings.MaxSSEReconnects = 1
	if err := NewSettingsService(db).SaveRequestSettings(settings); err != nil {
		t.Fatal(err)
	}
	project := mustCreateProject(t, db, "sse-run")
	module := defaultModule(t, db, project.ID)
	endpoint, err := NewEndpointService(db).CreateEndpoint(module.ID, nil, "stream", "GET", "/")
	if err != nil {
		t.Fatal(err)
	}

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{
		EndpointID: endpoint.ID, ModuleID: module.ID, Method: "GET", BaseURL: srv.URL, Path: "/",
	})
	if err != nil || !resp.Streaming {
		t.Fatalf("启动 SSE 失败: resp=%+v err=%v", resp, err)
	}
	if !waitFor(func() bool {
		var run models.RequestRun
		if err := db.Preload("Attempts").Order("created_at DESC").First(&run).Error; err != nil {
			return false
		}
		return run.Outcome == models.RequestRunOutcomeCompleted && len(run.Attempts) == 2
	}) {
		t.Fatalf("SSE 重连执行链未持久化，server requests=%d", requests.Load())
	}
	var run models.RequestRun
	if err := db.Preload("Attempts", func(tx *gorm.DB) *gorm.DB { return tx.Order("sequence ASC") }).First(&run).Error; err != nil {
		t.Fatal(err)
	}
	if run.Attempts[1].Cause != models.RequestAttemptCauseSSEReconnect || run.Attempts[1].ParentAttemptID == nil {
		t.Fatalf("SSE 重连 attempt 缺少因果关联: %+v", run.Attempts)
	}
}

// TestHTTP_StreamRegistryAndStop 验证流式响应会登记连接、StopStream 能主动结束并注销。
func TestHTTP_StreamRegistryAndStop(t *testing.T) {
	db := newTestDB(t)
	// 持续保持打开的 event-stream 服务器：写一条后阻塞，直到客户端断开（请求上下文取消）。
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		if fl, ok := w.(http.Flusher); ok {
			fmt.Fprint(w, "data: hi\n\n")
			fl.Flush()
		}
		<-r.Context().Done()
	}))

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/", EndpointID: "ep-stream", Timeout: 2000})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	// 流 ID 由后端生成且全局唯一：同一端点开多个流式标签页时不能互相覆盖
	if !resp.Streaming || resp.StreamID == "" {
		t.Fatalf("应为流式且返回非空 StreamID，实际 streaming=%v id=%q", resp.Streaming, resp.StreamID)
	}
	streamID := resp.StreamID
	if !waitFor(func() bool { return hs.IsStreaming(streamID) }) {
		t.Fatalf("流式连接应已登记")
	}
	if err := hs.StopStream(streamID); err != nil {
		t.Fatalf("StopStream err=%v", err)
	}
	if !waitFor(func() bool { return !hs.IsStreaming(streamID) }) {
		t.Fatalf("停止后应注销流式连接")
	}
}

func TestHTTP_QueryParams(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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

func TestHTTP_URLEncodedPreservesRepeatedNamesAndSanitizesLegacyFile(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/echo",
		BodyType: string(models.BodyTypeURLEncoded),
		BodyFields: []models.EndpointBodyField{
			{Name: "tag", Value: "a", Enabled: true},
			{Name: "tag", Value: "b", Enabled: true},
			{Name: "legacy", FieldType: "file", Value: `{"fileName":"old.txt","path":"/tmp/old.txt"}`, Enabled: true},
		},
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	echo := decodeEcho(t, resp.Body)
	body, _ := echo["body"].(string)
	parsed, err := url.ParseQuery(body)
	if err != nil {
		t.Fatalf("解析 urlencoded 请求体失败: %v", err)
	}
	if got := parsed["tag"]; !reflect.DeepEqual(got, []string{"a", "b"}) {
		t.Fatalf("同名字段 = %#v", got)
	}
	if got := parsed.Get("legacy"); got != "old.txt" {
		t.Fatalf("历史文件字段 = %q，期望文件名", got)
	}
}

func TestHTTP_BasicAuth(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)

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
	hs := newTestHTTPService(t, db)
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
	hs := newTestHTTPService(t, db)

	// 跟随重定向 → 最终 200
	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/redirect", FollowRedirects: new(true),
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("跟随重定向状态码 = %d，期望 200", resp.StatusCode)
	}
	if resp.RequestRun == nil || len(resp.RequestRun.Attempts) != 2 ||
		resp.RequestRun.Attempts[1].Cause != models.RequestAttemptCauseRedirect ||
		resp.RequestRun.Attempts[1].ParentAttemptID == nil {
		t.Fatalf("重定向链未完整捕获: %+v", resp.RequestRun)
	}

	// 不跟随 → 返回 302
	resp, err = hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/redirect", FollowRedirects: new(false),
	})
	if err != nil {
		t.Fatalf("err=%v", err)
	}
	if resp.StatusCode != 302 {
		t.Errorf("不跟随重定向状态码 = %d，期望 302", resp.StatusCode)
	}
	if resp.RequestRun == nil || len(resp.RequestRun.Attempts) != 1 {
		t.Fatalf("禁用重定向时只应有一次网络请求: %+v", resp.RequestRun)
	}
}

func TestHTTP_Timeout(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/slow", Timeout: 100, // 100ms
	})
	if err != nil {
		t.Fatalf("进入传输层后的失败应返回可诊断响应包络: %v", err)
	}
	if resp == nil || resp.Error == "" || resp.RequestRun == nil || resp.RequestRun.Outcome != models.RequestRunOutcomeTimedOut {
		t.Fatalf("超时响应缺少失败执行链: %+v", resp)
	}
}

func TestHTTP_SaveResponseAndHistory(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)
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
	var storedResponse models.Response
	if err := db.Where("endpoint_id = ?", e.ID).First(&storedResponse).Error; err != nil {
		t.Fatal(err)
	}
	var history models.RequestHistory
	if err := db.Where("module_id = ?", m.ID).First(&history).Error; err != nil {
		t.Fatal(err)
	}
	if storedResponse.RequestRunID == nil || history.RequestRunID == nil || *storedResponse.RequestRunID != *history.RequestRunID {
		t.Fatalf("响应和历史未关联同一执行链: response=%+v history=%+v", storedResponse.RequestRunID, history.RequestRunID)
	}
	detail, err := NewRequestHistoryService(db).GetHistoryDetail(history.ID)
	if err != nil || detail.RequestRun == nil || len(detail.RequestRun.Attempts) != 1 {
		t.Fatalf("历史详情未加载执行链: detail=%+v err=%v", detail, err)
	}
	endpointDetail, err := NewEndpointService(db).GetEndpoint(e.ID)
	if err != nil || endpointDetail.Response == nil || endpointDetail.Response.RequestRun == nil ||
		len(endpointDetail.Response.RequestRun.Attempts) != 1 {
		t.Fatalf("端点最近响应未加载执行链: detail=%+v err=%v", endpointDetail, err)
	}
}

// TestHTTP_TimingBreakdown 验证 httptrace 计时分解已生效：
// 服务端延迟 60ms 才写首字节，TTFB 应明显 > 0（修复前 attach 为空操作，恒为 0）
func TestHTTP_TimingBreakdown(t *testing.T) {
	db := newTestDB(t)
	srv := echoServer(t)
	hs := newTestHTTPService(t, db)

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
