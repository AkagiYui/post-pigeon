package services

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

func TestAuthBadgeInheritanceStatus(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "auth-badge")
	module := defaultModule(t, db, project.ID)
	if err := db.Model(&models.Module{}).Where("id = ?", module.ID).
		Updates(map[string]any{"auth_type": "bearer", "auth_data": `{"token":"module"}`}).Error; err != nil {
		t.Fatal(err)
	}

	var root models.Folder
	if err := db.Where("module_id = ? AND parent_id IS NULL", module.ID).First(&root).Error; err != nil {
		t.Fatal(err)
	}
	parent := models.Folder{ModuleID: module.ID, ParentID: &root.ID, Name: "parent", AuthType: "inherit"}
	if err := db.Create(&parent).Error; err != nil {
		t.Fatal(err)
	}
	child := models.Folder{ModuleID: module.ID, ParentID: &parent.ID, Name: "child", AuthType: "inherit"}
	if err := db.Create(&child).Error; err != nil {
		t.Fatal(err)
	}
	endpoint := models.Endpoint{ModuleID: module.ID, FolderID: &child.ID, Name: "endpoint", Method: "GET", Path: "/"}
	if err := db.Create(&endpoint).Error; err != nil {
		t.Fatal(err)
	}

	scope := NewScopeSettingsService(db)
	childSettings, err := scope.GetFolderSettings(child.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !childSettings.HasInheritedAuth {
		t.Fatal("子文件夹应从模块继承到认证")
	}
	detail, err := NewEndpointService(db).GetEndpoint(endpoint.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !detail.HasInheritedAuth {
		t.Fatal("接口应从文件夹/模块链继承到认证")
	}

	if err := db.Model(&models.Folder{}).Where("id = ?", parent.ID).Update("auth_type", "none").Error; err != nil {
		t.Fatal(err)
	}
	childSettings, _ = scope.GetFolderSettings(child.ID)
	if childSettings.HasInheritedAuth {
		t.Fatal("父文件夹的 none 应停止模块认证继承")
	}
	detail, _ = NewEndpointService(db).GetEndpoint(endpoint.ID)
	if detail.HasInheritedAuth {
		t.Fatal("父文件夹的 none 应让接口继承认证状态变为 false")
	}

	if err := db.Model(&models.Folder{}).Where("id = ?", child.ID).Update("auth_type", "basic").Error; err != nil {
		t.Fatal(err)
	}
	childSettings, _ = scope.GetFolderSettings(child.ID)
	if childSettings.HasInheritedAuth {
		t.Fatal("文件夹的上级状态不应把当前文件夹自己的认证算进去")
	}
	detail, _ = NewEndpointService(db).GetEndpoint(endpoint.ID)
	if !detail.HasInheritedAuth {
		t.Fatal("接口应把当前文件夹的具体认证算作继承认证")
	}
}

func TestParseDigestChallenge(t *testing.T) {
	challenge, ok := parseDigestChallenge(`Digest realm="test, realm", qop="auth", nonce="abc123", opaque="op", algorithm=SHA-256`)
	if !ok {
		t.Fatalf("应能解析 Digest 挑战")
	}
	if challenge.Realm != "test, realm" {
		t.Errorf("realm 中的逗号应被正确保留，实际 %q", challenge.Realm)
	}
	if challenge.Nonce != "abc123" || challenge.QOP != "auth" || challenge.Opaque != "op" {
		t.Errorf("挑战解析有误：%+v", challenge)
	}
	if challenge.Algorithm != "SHA-256" {
		t.Errorf("algorithm=%q", challenge.Algorithm)
	}

	if _, ok := parseDigestChallenge(`Basic realm="x"`); ok {
		t.Errorf("Basic 挑战不应被当作 Digest")
	}
	if _, ok := parseDigestChallenge(`Digest realm="x"`); ok {
		t.Errorf("缺少 nonce 的挑战应视为不可用")
	}
}

func TestBuildDigestAuthorization(t *testing.T) {
	challenge := digestChallenge{Realm: "r", Nonce: "n", QOP: "auth", Algorithm: "MD5"}
	value, err := buildDigestAuthorization(challenge, "u", "p", "GET", "/api", "")
	if err != nil {
		t.Fatalf("buildDigestAuthorization err=%v", err)
	}
	for _, want := range []string{`username="u"`, `realm="r"`, `nonce="n"`, `uri="/api"`, "qop=auth", "nc=00000001", "response="} {
		if !strings.Contains(value, want) {
			t.Errorf("Authorization 缺少 %q：%s", want, value)
		}
	}
}

// TestDigestAuthEndToEnd 用一个真实的 Digest 服务端验证 401 挑战 → 重发的完整往返。
func TestDigestAuthEndToEnd(t *testing.T) {
	db := newTestDB(t)

	var attempts int
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Digest ") {
			w.Header().Set("WWW-Authenticate", `Digest realm="protected", qop="auth", nonce="dcd98b71"`)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		// 只校验关键字段存在即可：摘要正确性已由单元测试覆盖
		for _, want := range []string{`username="admin"`, `realm="protected"`, "response="} {
			if !strings.Contains(auth, want) {
				w.WriteHeader(http.StatusForbidden)
				return
			}
		}
		_, _ = w.Write([]byte("secret data"))
	}))

	hs := newTestHTTPService(t, db)
	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/protected",
		Auth: &models.EndpointAuth{
			Type: string(models.AuthTypeDigest),
			Data: models.ToJSON(models.DigestAuthData{Username: "admin", Password: "s3cret"}),
		},
	})
	if err != nil {
		t.Fatalf("SendRequest err=%v", err)
	}
	if resp.StatusCode != 200 || resp.Body != "secret data" {
		t.Fatalf("Digest 认证未通过：status=%d body=%q", resp.StatusCode, resp.Body)
	}
	if attempts != 2 {
		t.Errorf("应恰好往返两次（挑战 + 应答），实际 %d 次", attempts)
	}
	if resp.RequestRun == nil || len(resp.RequestRun.Attempts) != 2 ||
		resp.RequestRun.Attempts[0].Cause != models.RequestAttemptCauseInitial ||
		resp.RequestRun.Attempts[1].Cause != models.RequestAttemptCauseDigest ||
		resp.RequestRun.Attempts[1].ParentAttemptID == nil {
		t.Fatalf("Digest 挑战链未完整捕获: %+v", resp.RequestRun)
	}
}

// TestOAuth2ClientCredentials 验证 client_credentials 换取令牌并注入 Authorization。
func TestOAuth2ClientCredentials(t *testing.T) {
	clearOAuthTokenCache()
	t.Cleanup(clearOAuthTokenCache)

	db := newTestDB(t)
	var tokenRequests int
	var receivedAuth string

	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token" {
			tokenRequests++
			_ = r.ParseForm()
			if r.Form.Get("grant_type") != "client_credentials" || r.Form.Get("client_id") != "cid" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "tok-abc", "token_type": "Bearer", "expires_in": 3600,
			})
			return
		}
		receivedAuth = r.Header.Get("Authorization")
		_, _ = w.Write([]byte("ok"))
	}))

	auth := &models.EndpointAuth{
		Type: string(models.AuthTypeOAuth2),
		Data: models.ToJSON(models.OAuth2AuthData{
			GrantType: "client_credentials", TokenURL: srv.URL + "/token",
			ClientID: "cid", ClientSecret: "csecret",
		}),
	}

	hs := newTestHTTPService(t, db)
	for i := range 2 {
		if _, err := hs.SendRequest(SendRequestData{
			Method: "GET", BaseURL: srv.URL, Path: "/api", Auth: auth,
		}); err != nil {
			t.Fatalf("第 %d 次请求失败: %v", i+1, err)
		}
	}

	if receivedAuth != "Bearer tok-abc" {
		t.Errorf("Authorization=%q", receivedAuth)
	}
	if tokenRequests != 1 {
		t.Errorf("令牌应被缓存复用，实际换取了 %d 次", tokenRequests)
	}
}

// TestOAuth2TokenEndpointFailure 验证换取令牌失败时给出可识别的错误。
func TestOAuth2TokenEndpointFailure(t *testing.T) {
	clearOAuthTokenCache()
	t.Cleanup(clearOAuthTokenCache)

	db := newTestDB(t)
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))

	hs := newTestHTTPService(t, db)
	_, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/api",
		Auth: &models.EndpointAuth{
			Type: string(models.AuthTypeOAuth2),
			Data: models.ToJSON(models.OAuth2AuthData{TokenURL: srv.URL + "/token", ClientID: "cid"}),
		},
	})
	if err == nil {
		t.Fatalf("token 端点返回 401 时应报错")
	}
}

func TestOAuth2MissingTokenURL(t *testing.T) {
	clearOAuthTokenCache()
	db := newTestDB(t)
	hs := newTestHTTPService(t, db)
	_, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: "http://127.0.0.1:0", Path: "/",
		Auth: &models.EndpointAuth{
			Type: string(models.AuthTypeOAuth2),
			Data: models.ToJSON(models.OAuth2AuthData{}),
		},
	})
	if err == nil {
		t.Fatalf("缺少 token 端点时应报错")
	}
}
