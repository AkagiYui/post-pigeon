package services

import (
	"net/http"
	"testing"
	"time"

	"PostPigeon/internal/models"
)

// TestCookieJarPersistsAcrossRequests 验证登录接口种下的 cookie 会自动带到后续请求，
// 这是「先登录再调接口」这一最常见调试流程的前提。
func TestCookieJarPersistsAcrossRequests(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "cookies")
	module := defaultModule(t, db, project.ID)

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
	if _, err := hs.SendRequest(SendRequestData{
		Method: "POST", BaseURL: srv.URL, Path: "/login", ModuleID: module.ID,
	}); err != nil {
		t.Fatalf("登录请求失败: %v", err)
	}

	if _, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/profile", ModuleID: module.ID,
	}); err != nil {
		t.Fatalf("后续请求失败: %v", err)
	}
	if receivedCookie != "s-123" {
		t.Fatalf("后续请求应自动携带会话 cookie，实际收到 %q", receivedCookie)
	}

	// 应已落库，供 Cookie 管理面板查看
	list, err := NewCookieService(db).ListCookies(project.ID)
	if err != nil {
		t.Fatalf("ListCookies err=%v", err)
	}
	if len(list) != 1 || list[0].Name != "sid" || list[0].Value != "s-123" {
		t.Fatalf("落库的 cookie 不正确：%+v", list)
	}
}

// TestCookieIsolatedBetweenProjects 验证不同项目之间的 cookie 互不串扰。
func TestCookieIsolatedBetweenProjects(t *testing.T) {
	db := newTestDB(t)
	a := mustCreateProject(t, db, "a")
	b := mustCreateProject(t, db, "b")

	svc := NewCookieService(db)
	if err := svc.UpsertCookie(models.StoredCookie{
		ProjectID: a.ID, Domain: "example.com", Path: "/", Name: "sid", Value: "from-a",
	}); err != nil {
		t.Fatalf("UpsertCookie err=%v", err)
	}

	listA, _ := svc.ListCookies(a.ID)
	listB, _ := svc.ListCookies(b.ID)
	if len(listA) != 1 {
		t.Errorf("项目 A 应有 1 条 cookie，实际 %d", len(listA))
	}
	if len(listB) != 0 {
		t.Errorf("项目 B 不应看到项目 A 的 cookie，实际 %d", len(listB))
	}
}

// TestCookieUpsertAndClear 验证手工编辑与清空。
func TestCookieUpsertAndClear(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "manual")
	svc := NewCookieService(db)

	base := models.StoredCookie{ProjectID: project.ID, Domain: "x.com", Path: "/", Name: "k", Value: "v1"}
	if err := svc.UpsertCookie(base); err != nil {
		t.Fatalf("UpsertCookie err=%v", err)
	}
	// 同一 (project, domain, path, name) 再写一次应更新而不是新增
	base.Value = "v2"
	if err := svc.UpsertCookie(base); err != nil {
		t.Fatalf("UpsertCookie err=%v", err)
	}
	list, _ := svc.ListCookies(project.ID)
	if len(list) != 1 || list[0].Value != "v2" {
		t.Fatalf("同名 cookie 应被更新：%+v", list)
	}

	if err := svc.DeleteCookie(list[0].ID); err != nil {
		t.Fatalf("DeleteCookie err=%v", err)
	}
	if remaining, _ := svc.ListCookies(project.ID); len(remaining) != 0 {
		t.Fatalf("删除后应为空：%+v", remaining)
	}

	if err := svc.UpsertCookie(base); err != nil {
		t.Fatalf("UpsertCookie err=%v", err)
	}
	if err := svc.ClearCookies(project.ID); err != nil {
		t.Fatalf("ClearCookies err=%v", err)
	}
	if remaining, _ := svc.ListCookies(project.ID); len(remaining) != 0 {
		t.Fatalf("清空后应为空：%+v", remaining)
	}
}

// TestCookieValidationAndPrune 验证入参校验与过期清理。
func TestCookieValidationAndPrune(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "prune")
	svc := NewCookieService(db)

	if err := svc.UpsertCookie(models.StoredCookie{ProjectID: project.ID, Name: "k"}); err == nil {
		t.Errorf("缺少域名应报错")
	}

	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)
	_ = svc.UpsertCookie(models.StoredCookie{ProjectID: project.ID, Domain: "x.com", Path: "/", Name: "old", Expires: &past})
	_ = svc.UpsertCookie(models.StoredCookie{ProjectID: project.ID, Domain: "x.com", Path: "/", Name: "new", Expires: &future})

	if err := svc.PruneExpiredCookies(project.ID); err != nil {
		t.Fatalf("PruneExpiredCookies err=%v", err)
	}
	list, _ := svc.ListCookies(project.ID)
	if len(list) != 1 || list[0].Name != "new" {
		t.Fatalf("过期 cookie 应被清理：%+v", list)
	}
}
