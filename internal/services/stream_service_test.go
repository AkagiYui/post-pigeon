package services

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"PostPigeon/internal/models"

	"github.com/coder/websocket"
)

type capturedWSHandshake struct {
	path    string
	query   url.Values
	header  http.Header
	cookies map[string]string
}

// TestWebSocketConnectUsesHTTPRequestEditingSemantics 钉住 WebSocket 握手与普通请求的公共语义。
// 这是实际会影响导入接口能否连接的核心链路：变量、模块参数、继承认证、Cookie 与前置脚本。
func TestWebSocketConnectUsesHTTPRequestEditingSemantics(t *testing.T) {
	captured := make(chan capturedWSHandshake, 1)
	serverErrors := make(chan error, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Handshake", "accepted")
		http.SetCookie(w, &http.Cookie{Name: "handshakeCookie", Value: "received", Path: "/"})
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			serverErrors <- err
			return
		}
		cookies := map[string]string{}
		for _, cookie := range r.Cookies() {
			cookies[cookie.Name] = cookie.Value
		}
		captured <- capturedWSHandshake{
			path: r.URL.Path, query: r.URL.Query(), header: r.Header.Clone(), cookies: cookies,
		}
		_, _, _ = conn.Read(r.Context())
		_ = conn.Close(websocket.StatusNormalClosure, "test complete")
	}))
	t.Cleanup(srv.Close)

	db := newTestDB(t)
	httpService := newTestHTTPService(t, db)
	wsService := NewWebSocketService(db, httpService)
	t.Cleanup(func() { _ = wsService.ServiceShutdown() })

	project := mustCreateProject(t, db, "ws-request-editing")
	module := defaultModule(t, db, project.ID)
	environment := firstEnvironment(t, db, project.ID)

	if err := NewGlobalVariableService(db).SaveGlobalVariables(project.ID, []models.GlobalVariable{
		{Key: "globalValue", Value: "from-global", Enabled: true},
	}); err != nil {
		t.Fatalf("保存全局变量失败: %v", err)
	}
	settings, err := NewScopeSettingsService(db).GetModuleSettings(module.ID)
	if err != nil {
		t.Fatal(err)
	}
	settings.AuthType = string(models.AuthTypeAPIKey)
	settings.AuthData = models.ToJSON(models.APIKeyAuthData{
		Key: "X-Api-Key", Value: "{{apiKey}}", In: "header",
	})
	settings.Params = []models.ModuleParam{
		{Type: "header", Name: "X-Module", Value: "module-{{apiKey}}", Enabled: true},
		{Type: "query", Name: "module", Value: "{{apiKey}}", Enabled: true},
		{Type: "query", Name: "disabled", Value: "must-not-be-sent", Enabled: true},
		{Type: "cookie", Name: "moduleCookie", Value: "{{apiKey}}", Enabled: true},
	}
	settings.Variables = []models.ModuleVariable{
		{Key: "apiKey", Value: "resolved-secret", Enabled: true, IsSecret: true},
	}
	if err := NewScopeSettingsService(db).SaveModuleSettings(module.ID, *settings); err != nil {
		t.Fatalf("保存模块设置失败: %v", err)
	}
	if err := NewEnvironmentService(db).SaveEnvironmentVariables(environment.ID, []models.EnvironmentVariable{
		{Key: "wsBase", Value: srv.URL, Enabled: true},
		{Key: "room", Value: "room-42", Enabled: true},
		{Key: "environmentValue", Value: "from-environment", Enabled: true},
	}); err != nil {
		t.Fatalf("保存环境变量失败: %v", err)
	}

	serverURL, _ := url.Parse(srv.URL)
	jarID := moduleDefaultJarID(t, httpService.cookies, module.ID)
	if err := httpService.cookies.UpsertCookie(models.StoredCookie{
		CookieJarID: jarID, Domain: serverURL.Hostname(), Path: "/",
		Name: "jarCookie", Value: "from-jar",
	}); err != nil {
		t.Fatalf("保存 Cookie 会话失败: %v", err)
	}

	endpoint := models.Endpoint{
		ModuleID: module.ID, Name: "ws", Type: string(models.EndpointTypeWebSocket),
		Method: http.MethodGet, Path: "/socket/{room}", DisabledGlobalParams: `["disabled"]`,
	}
	if err := db.Create(&endpoint).Error; err != nil {
		t.Fatalf("创建 WebSocket 端点失败: %v", err)
	}

	response, err := wsService.Connect(endpoint.ID, SendRequestData{
		EndpointID: endpoint.ID, ModuleID: module.ID, EnvironmentID: environment.ID,
		Method: http.MethodGet, BaseURL: "{{wsBase}}", Path: endpoint.Path,
		Headers: []models.EndpointHeader{
			{Name: "X-Environment", Value: "{{environmentValue}}", Enabled: true},
			{Name: "X-Global", Value: "{{globalValue}}", Enabled: true},
		},
		Params: []models.EndpointParam{
			{Type: "path", Name: "room", Value: "{{room}}", Enabled: true},
			{Type: "query", Name: "local", Value: "{{environmentValue}}", Enabled: true},
			{Type: "cookie", Name: "localCookie", Value: "{{environmentValue}}", Enabled: true},
		},
		Auth:                 &models.EndpointAuth{Type: string(models.AuthTypeInherit)},
		DisabledGlobalParams: endpoint.DisabledGlobalParams,
		Operations:           []models.Operation{},
		PreRequestScript: `
			console.log("pre-request-output");
			pm.request.headers.upsert("X-Script", pm.environment.get("environmentValue"));
			pm.request.url.query.add({ key: "script", value: pm.environment.get("environmentValue") });
		`,
		PostResponseScript: `
			console.log("post-response-output");
			pm.test("websocket upgraded", function () {
				pm.expect(pm.response.code).to.equal(101);
			});
			pm.response.headers.upsert("X-Post-Processed", "yes");
		`,
	}, true)
	if err != nil {
		t.Fatalf("建立 WebSocket 连接失败: %v", err)
	}
	if response == nil {
		t.Fatal("WebSocket 握手应返回标准响应数据")
	}
	if response.StatusCode != http.StatusSwitchingProtocols {
		t.Errorf("握手状态码 = %d，期望 101", response.StatusCode)
	}
	if got := http.Header(response.Headers).Get("X-Handshake"); got != "accepted" {
		t.Errorf("握手响应头未返回: %q", got)
	}
	if got := http.Header(response.Headers).Get("X-Post-Processed"); got != "yes" {
		t.Errorf("后置脚本对响应头的修改未返回: %q", got)
	}
	if len(response.Cookies) != 1 || response.Cookies[0].Name != "handshakeCookie" || response.Cookies[0].Value != "received" {
		t.Errorf("握手 Cookie 未返回: %+v", response.Cookies)
	}
	if response.ActualRequest.Method != http.MethodGet || response.ActualRequest.URL == "" {
		t.Errorf("实际握手请求未返回: %+v", response.ActualRequest)
	}
	if response.ActualRequest.Headers["Upgrade"] != "websocket" {
		t.Errorf("实际请求缺少 WebSocket Upgrade 头: %+v", response.ActualRequest.Headers)
	}
	if response.ActualRequest.Headers["X-Api-Key"] != "resolved-secret" {
		t.Errorf("实际请求未展示解析后的认证头: %+v", response.ActualRequest.Headers)
	}
	if response.Scripts == nil || response.Scripts.PreRequest == nil || response.Scripts.PostResponse == nil {
		t.Fatalf("握手响应应包含前后置脚本输出: %+v", response.Scripts)
	}
	if len(response.Scripts.PreRequest.Logs) != 1 || response.Scripts.PreRequest.Logs[0].Message != "pre-request-output" {
		t.Errorf("前置脚本日志未返回: %+v", response.Scripts.PreRequest.Logs)
	}
	if len(response.Scripts.PostResponse.Logs) != 1 || response.Scripts.PostResponse.Logs[0].Message != "post-response-output" {
		t.Errorf("后置脚本日志未返回: %+v", response.Scripts.PostResponse.Logs)
	}
	if tests := response.Scripts.PostResponse.Tests; len(tests) != 1 || !tests[0].Passed {
		t.Errorf("后置脚本断言未通过: %+v", tests)
	}

	select {
	case handshake := <-captured:
		if handshake.path != "/socket/room-42" {
			t.Errorf("路径变量未解析: %q", handshake.path)
		}
		wantQuery := map[string]string{
			"local": "from-environment", "module": "resolved-secret", "script": "from-environment",
		}
		for key, want := range wantQuery {
			if got := handshake.query.Get(key); got != want {
				t.Errorf("query %s = %q，期望 %q", key, got, want)
			}
		}
		if handshake.query.Has("disabled") {
			t.Errorf("接口禁用的模块 query 仍被发送: %v", handshake.query)
		}
		wantHeaders := map[string]string{
			"X-Api-Key": "resolved-secret", "X-Module": "module-resolved-secret",
			"X-Environment": "from-environment", "X-Global": "from-global", "X-Script": "from-environment",
		}
		for key, want := range wantHeaders {
			if got := handshake.header.Get(key); got != want {
				t.Errorf("header %s = %q，期望 %q", key, got, want)
			}
		}
		wantCookies := map[string]string{
			"jarCookie": "from-jar", "moduleCookie": "resolved-secret", "localCookie": "from-environment",
		}
		for key, want := range wantCookies {
			if got := handshake.cookies[key]; got != want {
				t.Errorf("cookie %s = %q，期望 %q", key, got, want)
			}
		}
	case err := <-serverErrors:
		t.Fatalf("服务端接受 WebSocket 失败: %v", err)
	case <-time.After(2 * time.Second):
		t.Fatal("未收到 WebSocket 握手")
	}

	if !wsService.IsConnected(endpoint.ID) {
		t.Fatal("握手成功后连接未登记")
	}
	if err := wsService.Close(endpoint.ID); err != nil {
		t.Fatalf("关闭 WebSocket 失败: %v", err)
	}
}

// TestWebSocketConnectReturnsRejectedHandshakeResponse 确保 400 等握手拒绝不会把
// 服务端响应与实际请求一起丢掉；前端需要这些数据定位 Origin、认证或代理问题。
func TestWebSocketConnectReturnsRejectedHandshakeResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-Rejection-Reason", "missing-origin")
		http.SetCookie(w, &http.Cookie{Name: "rejected", Value: "true", Path: "/"})
		http.Error(w, "handshake rejected", http.StatusBadRequest)
	}))
	t.Cleanup(srv.Close)

	db := newTestDB(t)
	httpService := newTestHTTPService(t, db)
	wsService := NewWebSocketService(db, httpService)
	t.Cleanup(func() { _ = wsService.ServiceShutdown() })

	response, err := wsService.Connect("rejected-handshake", SendRequestData{
		Method:  http.MethodGet,
		BaseURL: srv.URL,
		Path:    "/socket",
		Headers: []models.EndpointHeader{{Name: "Origin", Value: "https://example.test", Enabled: true}},
		PostResponseScript: `
			console.log("rejected-status", pm.response.code);
			pm.test("status is visible", function () {
				pm.expect(pm.response.code).to.equal(400);
			});
		`,
	}, true)
	if err != nil {
		t.Fatalf("握手拒绝仍应以可检查的响应返回: %v", err)
	}
	if response == nil || response.StatusCode != http.StatusBadRequest {
		t.Fatalf("握手拒绝状态未返回: %+v", response)
	}
	if got := http.Header(response.Headers).Get("X-Rejection-Reason"); got != "missing-origin" {
		t.Errorf("拒绝响应头未返回: %q", got)
	}
	if len(response.Cookies) != 1 || response.Cookies[0].Name != "rejected" {
		t.Errorf("拒绝响应 Cookie 未返回: %+v", response.Cookies)
	}
	if response.ActualRequest.Headers["Origin"] != "https://example.test" ||
		response.ActualRequest.Headers["Upgrade"] != "websocket" {
		t.Errorf("被拒绝握手的实际请求不完整: %+v", response.ActualRequest)
	}
	if response.Scripts == nil || response.Scripts.PostResponse == nil ||
		len(response.Scripts.PostResponse.Tests) != 1 || !response.Scripts.PostResponse.Tests[0].Passed {
		t.Errorf("握手拒绝响应未执行后置脚本: %+v", response.Scripts)
	}
	if wsService.IsConnected("rejected-handshake") {
		t.Fatal("握手被拒绝后不应登记连接")
	}
}
