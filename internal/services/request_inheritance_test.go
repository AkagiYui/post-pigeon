package services

import (
	"testing"
	"time"

	"PostPigeon/internal/models"
)

func boolPointer(value bool) *bool { return &value }

func TestRequestSettingsFiveLevelNestedFolders(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "five-level")
	module := defaultModule(t, db, project.ID)
	root := models.Folder{ModuleID: module.ID, Name: "root"}
	if err := db.Create(&root).Error; err != nil {
		t.Fatal(err)
	}
	child := models.Folder{ModuleID: module.ID, ParentID: &root.ID, Name: "child"}
	if err := db.Create(&child).Error; err != nil {
		t.Fatal(err)
	}
	endpoint := models.Endpoint{ModuleID: module.ID, FolderID: &child.ID, Name: "endpoint", Method: "GET", Path: "/", TimeoutMode: "inherit"}
	if err := db.Create(&endpoint).Error; err != nil {
		t.Fatal(err)
	}

	globalTimeout := 9000
	global := models.DefaultRequestSettings
	global.TimeoutMs = &globalTimeout
	global.FollowRedirects = true
	global.SendNoCacheHeaders = false
	global.URLEncoding = string(models.URLEncodingRFC3986)

	setScope := func(model any, id, urlEncoding, timeoutMode string, timeout int, redirects, noCache *bool) {
		t.Helper()
		if err := db.Model(model).Where("id = ?", id).Updates(map[string]any{
			"url_encoding":          urlEncoding,
			"timeout_mode":          timeoutMode,
			"timeout":               timeout,
			"follow_redirects":      redirects,
			"send_no_cache_headers": noCache,
		}).Error; err != nil {
			t.Fatal(err)
		}
	}
	setScope(&models.Project{}, project.ID, "off", "value", 8000, boolPointer(false), boolPointer(true))
	setScope(&models.Module{}, module.ID, "whatwg", "value", 7000, boolPointer(true), boolPointer(false))
	setScope(&models.Folder{}, root.ID, "off", "value", 6000, boolPointer(false), boolPointer(true))

	assertEffective := func(wantEncoding models.URLEncodingMode, wantTimeout time.Duration, wantRedirects, wantNoCache bool) {
		t.Helper()
		path := loadRequestScopePath(db, endpoint)
		if got := resolveURLEncodingForEndpoint(db, endpoint, "inherit"); got != wantEncoding {
			t.Errorf("URL 编码 = %q，期望 %q", got, wantEncoding)
		}
		if got := resolveRequestTimeout(path, "inherit", 0, global); got != wantTimeout {
			t.Errorf("超时 = %s，期望 %s", got, wantTimeout)
		}
		if got := resolveFollowRedirects(path, nil, global.FollowRedirects); got != wantRedirects {
			t.Errorf("重定向 = %v，期望 %v", got, wantRedirects)
		}
		if got := resolveSendNoCacheHeaders(path, nil, global.SendNoCacheHeaders); got != wantNoCache {
			t.Errorf("no-cache = %v，期望 %v", got, wantNoCache)
		}
	}

	// 子文件夹继承时，必须先命中它的直接父文件夹，而不是跳到模块。
	assertEffective(models.URLEncodingOff, 6*time.Second, false, true)
	setScope(&models.Folder{}, root.ID, "", "", 0, nil, nil)
	assertEffective(models.URLEncodingWHATWG, 7*time.Second, true, false)
	setScope(&models.Module{}, module.ID, "", "", 0, nil, nil)
	assertEffective(models.URLEncodingOff, 8*time.Second, false, true)
	setScope(&models.Project{}, project.ID, "", "", 0, nil, nil)
	assertEffective(models.URLEncodingRFC3986, 9*time.Second, true, false)

	// 接口显式值始终最高优先；unlimited 必须与 inherit 区分。
	path := loadRequestScopePath(db, endpoint)
	if got := resolveRequestTimeout(path, "unlimited", 123, global); got != 0 {
		t.Errorf("接口 unlimited 应为 0，实际 %s", got)
	}
	if got := resolveFollowRedirects(path, boolPointer(false), true); got {
		t.Error("接口显式关闭重定向未覆盖父级")
	}
}

func TestProxyAndTLSFiveLevelNestedFolders(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "proxy-tls-five-level")
	module := defaultModule(t, db, project.ID)
	root := models.Folder{ModuleID: module.ID, Name: "root"}
	if err := db.Create(&root).Error; err != nil {
		t.Fatal(err)
	}
	child := models.Folder{ModuleID: module.ID, ParentID: &root.ID, Name: "child"}
	if err := db.Create(&child).Error; err != nil {
		t.Fatal(err)
	}
	endpoint := models.Endpoint{ModuleID: module.ID, FolderID: &child.ID, Name: "endpoint", Method: "GET", Path: "/"}
	if err := db.Create(&endpoint).Error; err != nil {
		t.Fatal(err)
	}

	proxySvc := NewProxyService(db)
	if err := proxySvc.SaveGlobalProxySettings(models.ScopeProxySettings{ActiveID: "g", Proxies: []models.ProxyConfig{{ID: "g", Mode: "custom", Host: "global", Port: 80}}}); err != nil {
		t.Fatal(err)
	}
	if err := proxySvc.SaveProjectProxySettings(project.ID, models.ScopeProxySettings{ActiveID: "p", Proxies: []models.ProxyConfig{{ID: "p", Mode: "custom", Host: "project", Port: 81}}}); err != nil {
		t.Fatal(err)
	}
	if err := NewTLSService(db).SaveGlobalTLSSettings(models.ScopeTLSSettings{InsecureSkipVerify: true}); err != nil {
		t.Fatal(err)
	}
	if err := NewTLSService(db).SaveProjectTLSSettings(project.ID, models.ScopeTLSSettings{FollowGlobal: false, InsecureSkipVerify: false}); err != nil {
		t.Fatal(err)
	}

	moduleProxy := models.ToJSON(models.EndpointProxy{Mode: "ref", RefScope: "global", RefID: "g"})
	rootProxy := models.ToJSON(models.EndpointProxy{Mode: "none"})
	if err := db.Model(&models.Module{}).Where("id = ?", module.ID).Updates(map[string]any{"proxy_config": moduleProxy, "tls_config": models.ToJSON(models.EndpointTLS{Mode: "insecure"})}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.Folder{}).Where("id = ?", root.ID).Updates(map[string]any{"proxy_config": rootProxy, "tls_config": models.ToJSON(models.EndpointTLS{Mode: "strict"})}).Error; err != nil {
		t.Fatal(err)
	}

	if got := resolveEffectiveProxyForEndpoint(db, endpoint, models.EndpointProxy{Mode: "inherit"}); got.Mode != "none" {
		t.Errorf("应先命中直接父链 root 的 none，实际 %+v", got)
	}
	if got := resolveEffectiveTLSForEndpoint(db, endpoint, models.EndpointTLS{Mode: "inherit"}); got.InsecureSkipVerify {
		t.Error("应先命中 root 的 strict")
	}

	if err := db.Model(&models.Folder{}).Where("id = ?", root.ID).Updates(map[string]any{"proxy_config": "", "tls_config": ""}).Error; err != nil {
		t.Fatal(err)
	}
	if got := resolveEffectiveProxyForEndpoint(db, endpoint, models.EndpointProxy{Mode: "inherit"}); got.ID != "g" {
		t.Errorf("root 继承后应命中模块引用的 global/g，实际 %+v", got)
	}
	if got := resolveEffectiveTLSForEndpoint(db, endpoint, models.EndpointTLS{Mode: "inherit"}); !got.InsecureSkipVerify {
		t.Error("root 继承后应命中模块 insecure")
	}

	if got := resolveEffectiveProxyForEndpoint(db, endpoint, models.EndpointProxy{Mode: "none"}); got.Mode != "none" {
		t.Error("接口代理未覆盖文件夹链")
	}
	if got := resolveEffectiveTLSForEndpoint(db, endpoint, models.EndpointTLS{Mode: "strict"}); got.InsecureSkipVerify {
		t.Error("接口 TLS strict 未覆盖文件夹链")
	}
}
