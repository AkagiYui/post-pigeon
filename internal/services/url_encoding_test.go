package services

import (
	"net/http"
	"net/url"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

// TestRFC3986KeepsStdlibBehaviour 钉住「默认档位不改变既有行为」：
// rfc3986 档位下路径原封不动交给标准库、查询串与 url.QueryEscape 逐字节相同，
// 否则所有老项目升级后发出的 URL 都会悄悄变样。
func TestRFC3986KeepsStdlibBehaviour(t *testing.T) {
	paths := []string{
		"/中文/路径", "/a b/c", "/a<b>c", "/pre%E4%B8%AD", "/x!y'z(1)*",
		"/a+b&c=d,e;f:g@h", "/tilde~dash-dot.underscore_", "/",
	}
	for _, p := range paths {
		u, err := url.Parse("http://example.com" + p)
		if err != nil {
			t.Fatalf("解析 %q 失败: %v", p, err)
		}
		want := u.String()
		applyURLEncoding(u, url.Values{}, models.URLEncodingRFC3986)
		if u.Opaque != "" {
			t.Errorf("路径 %q：rfc3986 档位不应接管路径转义（Opaque=%q）", p, u.Opaque)
		}
		if u.String() != want {
			t.Errorf("路径 %q：rfc3986 档位改写了 URL，%q -> %q", p, want, u.String())
		}
	}

	values := []string{"中文", "a b", "a<b>", "a+b", "a&b=c", "100%", "~-._", "'quote'", "x!y(z)*"}
	for _, v := range values {
		if got, want := escapeQueryComponent(v, models.URLEncodingRFC3986), url.QueryEscape(v); got != want {
			t.Errorf("查询值 %q：rfc3986 得到 %q，标准库为 %q", v, got, want)
		}
	}
}

// TestEscapeURLPathByMode whatwg 与 off 档位在路径上的差别。
// rfc3986 不在其列：它的路径直接沿用标准库（见 TestRFC3986KeepsStdlibBehaviour）。
func TestEscapeURLPathByMode(t *testing.T) {
	cases := []struct {
		path        string
		whatwg, off string
	}{
		// 中文：编码档位转义，关闭档位原样发出
		{"/中", "/%E4%B8%AD", "/中"},
		// 已经写成 %XX 的部分任何档位都不再二次编码
		{"/%E4%B8%AD", "/%E4%B8%AD", "/%E4%B8%AD"},
		// whatwg 相对 rfc3986 额外放行的字符
		{"/a<b>", "/a<b>", "/a<b>"},
		{"/it's", "/it's", "/it's"},
		// 空格与会把 URL 拆错的字符，关闭档位也要转义
		{"/a b", "/a%20b", "/a%20b"},
		// 路径里合法的保留字符与子分隔符谁都不动
		{"/a+b,c;d=e!f(g)", "/a+b,c;d=e!f(g)", "/a+b,c;d=e!f(g)"},
	}
	for _, c := range cases {
		for _, m := range []struct {
			mode models.URLEncodingMode
			want string
		}{
			{models.URLEncodingWHATWG, c.whatwg},
			{models.URLEncodingOff, c.off},
		} {
			if got := escapeURLPath(c.path, m.mode); got != m.want {
				t.Errorf("escapeURLPath(%q, %s) = %q，期望 %q", c.path, m.mode, got, m.want)
			}
		}
	}
}

// TestEscapeQueryComponentByMode 三个档位在查询串上的差别。
func TestEscapeQueryComponentByMode(t *testing.T) {
	cases := []struct {
		value                string
		rfc3986, whatwg, off string
	}{
		{"中", "%E4%B8%AD", "%E4%B8%AD", "中"},
		{"a<b>", "a%3Cb%3E", "a<b>", "a<b>"},
		// 空格：编码档位沿用标准库的 +，关闭档位写成 %20（不改写字节本身）
		{"a b", "a+b", "a+b", "a%20b"},
		// 会把查询串拆错的字符，关闭档位也必须转义
		{"a&b=c", "a%26b%3Dc", "a%26b%3Dc", "a%26b%3Dc"},
		{"a+b", "a%2Bb", "a%2Bb", "a%2Bb"},
		// 关闭档位放行 %，手写的 %XX 才能原样发出去
		{"%20", "%2520", "%2520", "%20"},
	}
	for _, c := range cases {
		for _, m := range []struct {
			mode models.URLEncodingMode
			want string
		}{
			{models.URLEncodingRFC3986, c.rfc3986},
			{models.URLEncodingWHATWG, c.whatwg},
			{models.URLEncodingOff, c.off},
		} {
			if got := escapeQueryComponent(c.value, m.mode); got != m.want {
				t.Errorf("escapeQueryComponent(%q, %s) = %q，期望 %q", c.value, m.mode, got, m.want)
			}
		}
	}
}

// TestApplyURLEncodingUsesOpaqueOnlyWhenNeeded 默认档位不该动 Opaque，
// 只有自定义转义与标准转义不同时才挂上去。
func TestApplyURLEncodingUsesOpaqueOnlyWhenNeeded(t *testing.T) {
	parse := func(raw string) *url.URL {
		u, err := url.Parse(raw)
		if err != nil {
			t.Fatalf("解析 %q 失败: %v", raw, err)
		}
		return u
	}

	u := parse("http://example.com/中文")
	applyURLEncoding(u, url.Values{"q": {"中"}}, models.URLEncodingRFC3986)
	if u.Opaque != "" {
		t.Errorf("rfc3986 档位不应使用 Opaque，实际 %q", u.Opaque)
	}
	if want := "http://example.com/%E4%B8%AD%E6%96%87?q=%E4%B8%AD"; u.String() != want {
		t.Errorf("URL = %q，期望 %q", u.String(), want)
	}

	u = parse("http://example.com/中文")
	applyURLEncoding(u, url.Values{"q": {"中"}}, models.URLEncodingOff)
	if u.Opaque != "/中文" {
		t.Errorf("off 档位应把原始路径挂到 Opaque，实际 %q", u.Opaque)
	}
	if want := "/中文?q=中"; u.RequestURI() != want {
		t.Errorf("RequestURI = %q，期望 %q", u.RequestURI(), want)
	}
	if want := "http://example.com/中文?q=中"; urlWithHost(u) != want {
		t.Errorf("urlWithHost = %q，期望 %q", urlWithHost(u), want)
	}
}

// TestResolveURLEncodingChain 档位沿「接口 → 项目 → 全局」解析，
// 每一层选了具体档位就在那一层定下来。
func TestResolveURLEncodingChain(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "编码项目")
	module := defaultModule(t, db, project.ID)
	projects := NewProjectService(db)
	settings := NewSettingsService(db)

	// 三层都没设：用默认档位
	if got := resolveURLEncoding(db, module.ID, ""); got != models.DefaultURLEncoding {
		t.Fatalf("默认档位 = %s，期望 %s", got, models.DefaultURLEncoding)
	}

	// 全局设为 off，项目与接口都跟随
	global := models.DefaultRequestSettings
	global.URLEncoding = string(models.URLEncodingOff)
	if err := settings.SaveRequestSettings(global); err != nil {
		t.Fatalf("保存全局设置失败: %v", err)
	}
	if got := resolveURLEncoding(db, module.ID, string(models.URLEncodingInherit)); got != models.URLEncodingOff {
		t.Fatalf("跟随全局 = %s，期望 off", got)
	}

	// 项目覆盖全局
	if err := projects.SaveProjectURLEncoding(project.ID, string(models.URLEncodingWHATWG)); err != nil {
		t.Fatalf("保存项目档位失败: %v", err)
	}
	if got := resolveURLEncoding(db, module.ID, ""); got != models.URLEncodingWHATWG {
		t.Fatalf("项目档位 = %s，期望 whatwg", got)
	}

	// 接口覆盖项目
	if got := resolveURLEncoding(db, module.ID, string(models.URLEncodingRFC3986)); got != models.URLEncodingRFC3986 {
		t.Fatalf("接口档位 = %s，期望 rfc3986", got)
	}

	// 项目改回 inherit 后重新跟随全局
	if err := projects.SaveProjectURLEncoding(project.ID, string(models.URLEncodingInherit)); err != nil {
		t.Fatalf("重置项目档位失败: %v", err)
	}
	if got := resolveURLEncoding(db, module.ID, ""); got != models.URLEncodingOff {
		t.Fatalf("重置后 = %s，期望 off（跟随全局）", got)
	}
}

// TestSendRequestURLEncoding 端到端：接口级档位决定实际发出的请求行。
func TestSendRequestURLEncoding(t *testing.T) {
	var gotURI string
	srv := newTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotURI = r.RequestURI
		w.WriteHeader(http.StatusOK)
	}))
	db := newTestDB(t)
	project := mustCreateProject(t, db, "编码发送")
	module := defaultModule(t, db, project.ID)
	svc := newTestHTTPService(t, db)

	send := func(mode models.URLEncodingMode) string {
		gotURI = ""
		if _, err := svc.SendRequest(SendRequestData{
			ModuleID:    module.ID,
			Method:      "GET",
			BaseURL:     srv.URL,
			Path:        "/中文",
			Params:      []models.EndpointParam{{Type: "query", Name: "k", Value: "中", Enabled: true}},
			URLEncoding: string(mode),
		}); err != nil {
			t.Fatalf("发送请求失败(%s): %v", mode, err)
		}
		return gotURI
	}

	if got, want := send(models.URLEncodingRFC3986), "/%E4%B8%AD%E6%96%87?k=%E4%B8%AD"; got != want {
		t.Errorf("rfc3986 请求行 = %q，期望 %q", got, want)
	}
	// 关闭编码：中文原样进请求行，服务端拿到的就是那几个字节
	if got, want := send(models.URLEncodingOff), "/中文?k=中"; got != want {
		t.Errorf("off 请求行 = %q，期望 %q", got, want)
	}
}

// TestToCurlURLEncoding 导出的 cURL 与实际发送用同一套编码。
func TestToCurlURLEncoding(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "编码导出")
	module := defaultModule(t, db, project.ID)

	data := SendRequestData{
		ModuleID:    module.ID,
		Method:      "GET",
		BaseURL:     "http://example.com",
		Path:        "/中文",
		Params:      []models.EndpointParam{{Type: "query", Name: "k", Value: "中", Enabled: true}},
		URLEncoding: string(models.URLEncodingOff),
	}
	cmd, err := NewCurlService(db).ToCurl(data)
	if err != nil {
		t.Fatalf("导出 cURL 失败: %v", err)
	}
	if !strings.Contains(cmd, "http://example.com/中文?k=中") {
		t.Errorf("导出的命令里没有未编码的 URL：\n%s", cmd)
	}
}
