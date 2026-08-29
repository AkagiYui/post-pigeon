package services

import (
	"net/http"
	"net/url"
	"testing"
	"time"

	"PostPigeon/internal/models"
)

func moduleDefaultJarID(t *testing.T, svc *CookieService, moduleID string) string {
	t.Helper()
	jarID, enabled, err := svc.resolveJarID(moduleID, "")
	if err != nil || !enabled || jarID == "" {
		t.Fatalf("解析模块 Cookie Jar: id=%q enabled=%v err=%v", jarID, enabled, err)
	}
	return jarID
}

// TestCookieJarPersistsAcrossRequests 验证同一模块内「先登录、再调用」会保持会话。
func TestCookieJarPersistsAcrossRequests(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "cookies")
	module := defaultModule(t, db, project.ID)
	environment := firstEnvironment(t, db, project.ID)

	var receivedCookie string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/login" {
			http.SetCookie(w, &http.Cookie{Name: "sid", Value: "s-123", Path: "/"})
			_, _ = w.Write([]byte("ok"))
			return
		}
		if c, err := r.Cookie("sid"); err == nil {
			receivedCookie = c.Value
		}
		_, _ = w.Write([]byte("done"))
	}))

	hs := newTestHTTPService(t, db)
	request := SendRequestData{BaseURL: srv.URL, ModuleID: module.ID, EnvironmentID: environment.ID}
	request.Method, request.Path = http.MethodPost, "/login"
	if _, err := hs.SendRequest(request); err != nil {
		t.Fatalf("登录请求失败: %v", err)
	}
	request.Method, request.Path = http.MethodGet, "/profile"
	if _, err := hs.SendRequest(request); err != nil {
		t.Fatalf("后续请求失败: %v", err)
	}
	if receivedCookie != "s-123" {
		t.Fatalf("后续请求应自动携带会话 cookie，实际收到 %q", receivedCookie)
	}

	svc := NewCookieService(db)
	list, err := svc.ListCookies(moduleDefaultJarID(t, svc, module.ID))
	if err != nil || len(list) != 1 || list[0].Value != "s-123" {
		t.Fatalf("落库的 cookie 不正确：%+v err=%v", list, err)
	}
}

// TestCookieModulesArePrivateByDefaultAndCanShare 验证模块默认隔离，显式绑定同一 Jar 后共享。
func TestCookieModulesArePrivateByDefaultAndCanShare(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "modules")
	moduleA := defaultModule(t, db, project.ID)
	moduleB, err := NewModuleService(db).CreateModule(project.ID, "B")
	if err != nil {
		t.Fatal(err)
	}
	environment := firstEnvironment(t, db, project.ID)

	var received []string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/login" {
			http.SetCookie(w, &http.Cookie{Name: "sid", Value: "module-a", Path: "/"})
		}
		value := ""
		if cookie, err := r.Cookie("sid"); err == nil {
			value = cookie.Value
		}
		received = append(received, value)
		_, _ = w.Write([]byte("ok"))
	}))

	hs := newTestHTTPService(t, db)
	if _, err := hs.SendRequest(SendRequestData{Method: http.MethodPost, BaseURL: srv.URL, Path: "/login", ModuleID: moduleA.ID, EnvironmentID: environment.ID}); err != nil {
		t.Fatal(err)
	}
	if _, err := hs.SendRequest(SendRequestData{Method: http.MethodGet, BaseURL: srv.URL, Path: "/profile", ModuleID: moduleB.ID, EnvironmentID: environment.ID}); err != nil {
		t.Fatal(err)
	}
	if received[1] != "" {
		t.Fatalf("模块 B 默认不应拿到模块 A Cookie，实际 %q", received[1])
	}

	svc := NewCookieService(db)
	sharedJarID := moduleDefaultJarID(t, svc, moduleA.ID)
	if err := svc.SetModuleCookieBinding(moduleB.ID, "", sharedJarID, false); err != nil {
		t.Fatalf("共享 Cookie Jar 失败: %v", err)
	}
	if _, err := hs.SendRequest(SendRequestData{Method: http.MethodGet, BaseURL: srv.URL, Path: "/shared", ModuleID: moduleB.ID, EnvironmentID: environment.ID}); err != nil {
		t.Fatal(err)
	}
	if received[2] != "module-a" {
		t.Fatalf("共享后模块 B 应拿到模块 A Cookie，实际 %q", received[2])
	}
}

func TestCookieJarCannotBeSharedAcrossProjects(t *testing.T) {
	db := newTestDB(t)
	projectA := mustCreateProject(t, db, "project-a")
	projectB := mustCreateProject(t, db, "project-b")
	moduleA := defaultModule(t, db, projectA.ID)
	moduleB := defaultModule(t, db, projectB.ID)
	svc := NewCookieService(db)

	jarA := moduleDefaultJarID(t, svc, moduleA.ID)
	if err := svc.SetModuleCookieBinding(moduleB.ID, "", jarA, false); err == nil {
		t.Fatal("不同项目的模块不应能绑定同一个 Cookie Jar")
	}
	jarB := moduleDefaultJarID(t, svc, moduleB.ID)
	if jarA == jarB {
		t.Fatal("不同项目不应共享默认 Cookie Jar")
	}
}

func TestCookieEnvironmentOverrideCanDisableAndInherit(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "environment")
	module := defaultModule(t, db, project.ID)
	environments, _ := NewEnvironmentService(db).ListEnvironments(project.ID)
	svc := NewCookieService(db)
	jarID := moduleDefaultJarID(t, svc, module.ID)

	if err := svc.UpsertCookie(models.StoredCookie{CookieJarID: jarID, Domain: "example.com", Path: "/", Name: "sid", Value: "default"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.SetModuleCookieBinding(module.ID, environments[0].ID, "", true); err != nil {
		t.Fatal(err)
	}
	if cookies := svc.jarForRequest(module.ID, environments[0].ID).Cookies(mustURL(t, "https://example.com/")); len(cookies) != 0 {
		t.Fatalf("禁用覆盖仍带 Cookie: %+v", cookies)
	}
	if cookies := svc.jarForRequest(module.ID, environments[1].ID).Cookies(mustURL(t, "https://example.com/")); len(cookies) != 1 {
		t.Fatalf("无覆盖环境应继承模块 Jar: %+v", cookies)
	}
	if err := svc.ClearModuleCookieBinding(module.ID, environments[0].ID); err != nil {
		t.Fatal(err)
	}
	if cookies := svc.jarForRequest(module.ID, environments[0].ID).Cookies(mustURL(t, "https://example.com/")); len(cookies) != 1 {
		t.Fatalf("清除覆盖后应恢复继承: %+v", cookies)
	}
}

func TestCookieJarFiltersByURLAndPublicSuffix(t *testing.T) {
	jar := newMemoryCookieJar()
	jar.SetCookies(mustURL(t, "https://api.example.com/app/login"), []*http.Cookie{
		{Name: "app", Value: "1", Path: "/app", Secure: true},
		{Name: "root", Value: "2", Path: "/"},
	})
	if got := jar.Cookies(mustURL(t, "https://api.example.com/other")); len(got) != 1 || got[0].Name != "root" {
		t.Fatalf("Path 匹配错误: %+v", got)
	}
	if got := jar.Cookies(mustURL(t, "http://api.example.com/app")); len(got) != 1 || got[0].Name != "root" {
		t.Fatalf("Secure 匹配错误: %+v", got)
	}
	jar.SetCookies(mustURL(t, "https://example.com/"), []*http.Cookie{{Name: "bad", Value: "1", Domain: ".com", Path: "/"}})
	if got := jar.Cookies(mustURL(t, "https://another.com/")); len(got) != 0 {
		t.Fatalf("公共后缀 Cookie 不应生效: %+v", got)
	}
}

func TestPersistentCookieJarPreservesHostOnlyAndDefaultPath(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "scope")
	module := defaultModule(t, db, project.ID)
	svc := NewCookieService(db)
	jarID := moduleDefaultJarID(t, svc, module.ID)

	jar := newPersistentJar(svc, jarID)
	jar.SetCookies(mustURL(t, "https://api.example.com/app/login"), []*http.Cookie{
		{Name: "host", Value: "1"},
		{Name: "domain", Value: "2", Domain: ".example.com", Path: "/"},
	})

	reloaded := newPersistentJar(svc, jarID)
	if got := reloaded.Cookies(mustURL(t, "https://api.example.com/app/profile")); len(got) != 2 {
		t.Fatalf("原主机与默认路径应命中两条 Cookie: %+v", got)
	}
	if got := reloaded.Cookies(mustURL(t, "https://api.example.com/other")); len(got) != 1 || got[0].Name != "domain" {
		t.Fatalf("默认 Path 不应扩散到根路径: %+v", got)
	}
	if got := reloaded.Cookies(mustURL(t, "https://sub.example.com/app/profile")); len(got) != 1 || got[0].Name != "domain" {
		t.Fatalf("HostOnly Cookie 不应扩散到其他子域: %+v", got)
	}
}

func TestCookieUpsertClearAndPrune(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "manual")
	module := defaultModule(t, db, project.ID)
	svc := NewCookieService(db)
	jarID := moduleDefaultJarID(t, svc, module.ID)

	base := models.StoredCookie{CookieJarID: jarID, Domain: "x.com", Path: "/", Name: "k", Value: "v1"}
	if err := svc.UpsertCookie(base); err != nil {
		t.Fatal(err)
	}
	base.Value = "v2"
	if err := svc.UpsertCookie(base); err != nil {
		t.Fatal(err)
	}
	list, _ := svc.ListCookies(jarID)
	if len(list) != 1 || list[0].Value != "v2" {
		t.Fatalf("同名 cookie 应更新：%+v", list)
	}
	if err := svc.DeleteCookie(list[0].ID); err != nil {
		t.Fatal(err)
	}

	past, future := time.Now().Add(-time.Hour), time.Now().Add(time.Hour)
	_ = svc.UpsertCookie(models.StoredCookie{CookieJarID: jarID, Domain: "x.com", Path: "/", Name: "old", Expires: &past})
	_ = svc.UpsertCookie(models.StoredCookie{CookieJarID: jarID, Domain: "x.com", Path: "/", Name: "new", Expires: &future})
	if err := svc.PruneExpiredCookies(jarID); err != nil {
		t.Fatal(err)
	}
	list, _ = svc.ListCookies(jarID)
	if len(list) != 1 || list[0].Name != "new" {
		t.Fatalf("过期 cookie 应清理：%+v", list)
	}
	if err := svc.ClearCookies(jarID); err != nil {
		t.Fatal(err)
	}
	if list, _ = svc.ListCookies(jarID); len(list) != 0 {
		t.Fatalf("Jar 应已清空：%+v", list)
	}
}

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	return u
}
