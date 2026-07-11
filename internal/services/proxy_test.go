package services

import (
	"net/http"
	"testing"

	"post-pigeon/internal/models"
)

// reqTo 构造一个指向给定 URL 的请求，用于测试代理函数。
func reqTo(t *testing.T, rawurl string) *http.Request {
	t.Helper()
	req, err := http.NewRequest("GET", rawurl, nil)
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}
	return req
}

func TestNormalizeScopeProxySettings_BuiltinsAlwaysPresent(t *testing.T) {
	s := models.ScopeProxySettings{}
	models.NormalizeScopeProxySettings(&s, false)
	if len(s.Proxies) != 2 {
		t.Fatalf("期望仅两个内置条目，实际 %d", len(s.Proxies))
	}
	if s.Proxies[0].ID != models.ProxyBuiltinSystemID || s.Proxies[1].ID != models.ProxyBuiltinNoneID {
		t.Fatalf("内置条目顺序/ID 不正确: %+v", s.Proxies)
	}
	if s.ActiveID != models.ProxyBuiltinSystemID {
		t.Fatalf("默认 ActiveID 应为 system，实际 %q", s.ActiveID)
	}
}

func TestNormalizeScopeProxySettings_KeepsCustomAndValidatesActive(t *testing.T) {
	s := models.ScopeProxySettings{
		ActiveID: "does-not-exist",
		Proxies: []models.ProxyConfig{
			{ID: "c1", Name: "corp", Mode: "custom", Protocol: "http", Host: "127.0.0.1", Port: 8080},
			// 重复的内置条目应被剔除并统一重建
			{ID: models.ProxyBuiltinSystemID, Name: "dup", Mode: "system"},
		},
	}
	models.NormalizeScopeProxySettings(&s, false)
	// 2 内置 + 1 自定义
	if len(s.Proxies) != 3 {
		t.Fatalf("期望 3 个条目，实际 %d: %+v", len(s.Proxies), s.Proxies)
	}
	if _, ok := models.FindProxy(s.Proxies, "c1"); !ok {
		t.Fatalf("自定义条目 c1 丢失")
	}
	// ActiveID 非法 → 回退 system
	if s.ActiveID != models.ProxyBuiltinSystemID {
		t.Fatalf("非法 ActiveID 应回退 system，实际 %q", s.ActiveID)
	}
}

func TestBuildProxyFunc_NoneAndCustom(t *testing.T) {
	// none → 始终直连
	none := buildProxyFunc(models.ProxyConfig{Mode: "none"}, nil)
	if u, _ := none(reqTo(t, "https://example.com")); u != nil {
		t.Fatalf("none 模式应返回 nil 代理，实际 %v", u)
	}

	// custom http，无 bypass
	custom := buildProxyFunc(models.ProxyConfig{
		Mode: "custom", Protocol: "http", Host: "127.0.0.1", Port: 8888,
	}, nil)
	u, err := custom(reqTo(t, "https://example.com/x"))
	if err != nil || u == nil {
		t.Fatalf("custom 模式应返回代理 URL，err=%v u=%v", err, u)
	}
	if u.Scheme != "http" || u.Host != "127.0.0.1:8888" {
		t.Fatalf("代理 URL 不正确: %s", u.String())
	}

	// socks5 + 身份验证
	socks := buildProxyFunc(models.ProxyConfig{
		Mode: "custom", Protocol: "socks5", Host: "proxy.local", Port: 1080,
		Auth: true, Username: "u", Password: "p",
	}, nil)
	su, _ := socks(reqTo(t, "https://example.com"))
	if su == nil || su.Scheme != "socks5" || su.Host != "proxy.local:1080" {
		t.Fatalf("socks5 代理 URL 不正确: %v", su)
	}
	if user := su.User.Username(); user != "u" {
		t.Fatalf("socks5 用户名不正确: %q", user)
	}
}

func TestBuildProxyFunc_Bypass(t *testing.T) {
	fn := buildProxyFunc(models.ProxyConfig{
		Mode: "custom", Protocol: "http", Host: "127.0.0.1", Port: 8080,
		Bypass: "localhost, *.internal.com, 10.0.0.1",
	}, nil)

	cases := []struct {
		url      string
		bypassed bool
	}{
		{"http://localhost:3000", true},
		{"http://api.internal.com/x", true},
		{"http://internal.com/x", true},
		{"http://10.0.0.1/x", true},
		{"https://example.com", false},
		{"https://notinternal.com", false},
	}
	for _, c := range cases {
		u, _ := fn(reqTo(t, c.url))
		if c.bypassed && u != nil {
			t.Errorf("%s 应被 bypass（直连），实际走代理 %v", c.url, u)
		}
		if !c.bypassed && u == nil {
			t.Errorf("%s 不应被 bypass，实际直连", c.url)
		}
	}
}

func TestProxyService_GlobalSaveLoad(t *testing.T) {
	db := newTestDB(t)
	svc := NewProxyService(db)

	got, _ := svc.GetGlobalProxySettings()
	if len(got.Proxies) != 2 {
		t.Fatalf("初始全局设置应有两个内置条目，实际 %d", len(got.Proxies))
	}

	// 保存一个自定义代理并设为默认
	err := svc.SaveGlobalProxySettings(models.ScopeProxySettings{
		ActiveID: "corp",
		Proxies: []models.ProxyConfig{
			{ID: "corp", Name: "公司代理", Mode: "custom", Protocol: "http", Host: "127.0.0.1", Port: 7890},
		},
	})
	if err != nil {
		t.Fatalf("保存全局代理失败: %v", err)
	}
	got, _ = svc.GetGlobalProxySettings()
	if got.ActiveID != "corp" {
		t.Fatalf("全局 ActiveID 未持久化，实际 %q", got.ActiveID)
	}
	if _, ok := models.FindProxy(got.Proxies, "corp"); !ok {
		t.Fatalf("自定义全局代理未持久化")
	}
}

func TestResolveEffectiveProxy_Chain(t *testing.T) {
	db := newTestDB(t)
	proxySvc := NewProxyService(db)
	proj := mustCreateProject(t, db, "P")
	mod := defaultModule(t, db, proj.ID)

	// 全局默认 = 公司代理
	if err := proxySvc.SaveGlobalProxySettings(models.ScopeProxySettings{
		ActiveID: "g1",
		Proxies:  []models.ProxyConfig{{ID: "g1", Name: "global-proxy", Mode: "custom", Protocol: "http", Host: "10.0.0.9", Port: 8080}},
	}); err != nil {
		t.Fatalf("保存全局失败: %v", err)
	}

	// 项目跟随全局（默认）→ inherit 接口应解析到全局 g1
	eff := resolveEffectiveProxy(db, mod.ID, models.EndpointProxy{Mode: "inherit"})
	if eff.ID != "g1" {
		t.Fatalf("inherit + 项目跟随全局 应解析到 g1，实际 %q(%s)", eff.ID, eff.Mode)
	}

	// 项目改为自选 p1
	if err := proxySvc.SaveProjectProxySettings(proj.ID, models.ScopeProxySettings{
		FollowGlobal: false,
		ActiveID:     "p1",
		Proxies:      []models.ProxyConfig{{ID: "p1", Name: "proj-proxy", Mode: "custom", Protocol: "socks5", Host: "127.0.0.1", Port: 1080}},
	}); err != nil {
		t.Fatalf("保存项目失败: %v", err)
	}
	eff = resolveEffectiveProxy(db, mod.ID, models.EndpointProxy{Mode: "inherit"})
	if eff.ID != "p1" {
		t.Fatalf("inherit + 项目自选 应解析到 p1，实际 %q", eff.ID)
	}

	// 接口 none → 直连
	eff = resolveEffectiveProxy(db, mod.ID, models.EndpointProxy{Mode: "none"})
	if eff.Mode != string(models.ProxyModeNone) {
		t.Fatalf("接口 none 应解析为 none，实际 %s", eff.Mode)
	}

	// 接口 ref 全局 g1
	eff = resolveEffectiveProxy(db, mod.ID, models.EndpointProxy{Mode: "ref", RefScope: "global", RefID: "g1"})
	if eff.ID != "g1" {
		t.Fatalf("接口 ref global/g1 应解析到 g1，实际 %q", eff.ID)
	}

	// 接口 ref 失效 → 回退 inherit 链（此时项目自选 p1）
	eff = resolveEffectiveProxy(db, mod.ID, models.EndpointProxy{Mode: "ref", RefScope: "project", RefID: "nope"})
	if eff.ID != "p1" {
		t.Fatalf("失效 ref 应回退到 p1，实际 %q", eff.ID)
	}
}

func TestListSelectableProxies(t *testing.T) {
	db := newTestDB(t)
	svc := NewProxyService(db)
	proj := mustCreateProject(t, db, "P")

	_ = svc.SaveProjectProxySettings(proj.ID, models.ScopeProxySettings{
		FollowGlobal: false, ActiveID: "p1",
		Proxies: []models.ProxyConfig{{ID: "p1", Name: "proj", Mode: "custom", Host: "h", Port: 1}},
	})
	list, err := svc.ListSelectableProxies(proj.ID)
	if err != nil {
		t.Fatalf("列出可选代理失败: %v", err)
	}
	// 项目: system,none,p1 + 全局: system,none = 5
	if len(list) != 5 {
		t.Fatalf("期望 5 个可选条目，实际 %d: %+v", len(list), list)
	}
	if list[0].Scope != models.ProxyScopeProject {
		t.Fatalf("首项应为项目作用域，实际 %s", list[0].Scope)
	}
}
