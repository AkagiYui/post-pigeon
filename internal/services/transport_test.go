package services

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// TestSharedTransportReuse 验证相同配置复用同一个 Transport、不同配置各自独立。
// Transport 复用是连接池生效的前提，否则每次请求都要重新 DNS+TCP+TLS。
func TestSharedTransportReuse(t *testing.T) {
	t.Cleanup(closeAllTransports)

	direct := resolveProxy(models.ProxyConfig{Mode: string(models.ProxyModeNone)}, nil)
	a, err := sharedTransport(direct, tlsOptions{})
	if err != nil {
		t.Fatalf("sharedTransport err=%v", err)
	}
	b, err := sharedTransport(direct, tlsOptions{})
	if err != nil {
		t.Fatalf("sharedTransport err=%v", err)
	}
	if a != b {
		t.Errorf("相同代理+TLS 配置应复用同一个 Transport")
	}

	c, err := sharedTransport(direct, tlsOptions{InsecureSkipVerify: true})
	if err != nil {
		t.Fatalf("sharedTransport err=%v", err)
	}
	if a == c {
		t.Errorf("TLS 配置不同应使用不同的 Transport")
	}

	custom := resolveProxy(models.ProxyConfig{
		Mode: string(models.ProxyModeCustom), Protocol: "http", Host: "127.0.0.1", Port: 8080,
	}, nil)
	d, err := sharedTransport(custom, tlsOptions{})
	if err != nil {
		t.Fatalf("sharedTransport err=%v", err)
	}
	if a == d {
		t.Errorf("代理配置不同应使用不同的 Transport")
	}
}

// TestTransportEnablesHTTP2 验证共享 Transport 显式开启了 HTTP/2 协商。
// 一旦设置了自定义 TLSClientConfig，不显式打开 ForceAttemptHTTP2 就会永远退回 HTTP/1.1。
func TestTransportEnablesHTTP2(t *testing.T) {
	t.Cleanup(closeAllTransports)

	tr, err := sharedTransport(resolveProxy(models.ProxyConfig{Mode: string(models.ProxyModeNone)}, nil), tlsOptions{})
	if err != nil {
		t.Fatalf("sharedTransport err=%v", err)
	}
	if !tr.ForceAttemptHTTP2 {
		t.Errorf("共享 Transport 必须开启 ForceAttemptHTTP2")
	}
	if tr.MaxIdleConnsPerHost <= 0 {
		t.Errorf("应配置每主机空闲连接上限，实际 %d", tr.MaxIdleConnsPerHost)
	}
}

// TestTLSOptionsBuild 验证 TLS 选项映射与非法证书的错误码。
func TestTLSOptionsBuild(t *testing.T) {
	cfg, err := tlsOptions{MinVersion: string(models.TLSVersion13)}.build()
	if err != nil {
		t.Fatalf("build err=%v", err)
	}
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("MinVersion=%d", cfg.MinVersion)
	}

	if _, err := (tlsOptions{CACert: "not a pem"}).build(); err == nil {
		t.Errorf("非法 CA 证书应报错")
	} else if code := apperr.Code(err); code != apperr.CodeTLSConfigInvalid {
		t.Errorf("错误码=%s", code)
	}

	// 客户端证书与私钥必须成对提供
	if _, err := (tlsOptions{ClientCert: "cert-only"}).build(); err == nil {
		t.Errorf("只给证书不给私钥应报错")
	}
}

// TestInsecureSkipVerifyAllowsSelfSigned 验证接口级 insecure 能连上自签证书服务，
// 而默认（严格校验）会失败——这正是「忽略证书错误」开关存在的意义。
func TestInsecureSkipVerifyAllowsSelfSigned(t *testing.T) {
	db := newTestDB(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("secure"))
	}))
	t.Cleanup(func() {
		closeAllTransports()
		srv.Close()
	})

	hs := newTestHTTPService(t, db)

	// 默认严格校验：自签证书应被拒绝
	if _, err := hs.SendRequest(SendRequestData{Method: "GET", BaseURL: srv.URL, Path: "/"}); err == nil {
		t.Errorf("默认应校验证书并拒绝自签证书")
	}

	// 接口级选择 insecure：应能连通
	resp, err := hs.SendRequest(SendRequestData{
		Method: "GET", BaseURL: srv.URL, Path: "/",
		TLSConfig: models.ToJSON(models.EndpointTLS{Mode: string(models.EndpointTLSInsecure)}),
	})
	if err != nil {
		t.Fatalf("insecure 模式下应连通，err=%v", err)
	}
	if resp.Body != "secure" {
		t.Errorf("响应体=%q", resp.Body)
	}
}

// TestResolveProxyCacheKey 验证解析后的代理描述能稳定区分不同配置。
func TestResolveProxyCacheKey(t *testing.T) {
	withVar := resolveProxy(models.ProxyConfig{
		Mode: string(models.ProxyModeCustom), Protocol: "http", Host: "{{proxyHost}}", Port: 8080,
	}, map[string]string{"proxyHost": "10.0.0.1"})
	if got := withVar.url.Host; got != "10.0.0.1:8080" {
		t.Errorf("代理主机中的变量应被解析，实际 %q", got)
	}

	other := resolveProxy(models.ProxyConfig{
		Mode: string(models.ProxyModeCustom), Protocol: "http", Host: "{{proxyHost}}", Port: 8080,
	}, map[string]string{"proxyHost": "10.0.0.2"})
	if withVar.cacheKey() == other.cacheKey() {
		t.Errorf("变量解析到不同主机时缓存键必须不同")
	}

	// 主机为空的自定义代理等同直连
	empty := resolveProxy(models.ProxyConfig{Mode: string(models.ProxyModeCustom)}, nil)
	if empty.mode != string(models.ProxyModeNone) {
		t.Errorf("未填主机的自定义代理应退化为直连，实际 %q", empty.mode)
	}
}

// TestResolveEffectiveTLS 验证接口级 strict/insecure 对上级设置的覆盖关系。
func TestResolveEffectiveTLS(t *testing.T) {
	db := newTestDB(t)
	project := mustCreateProject(t, db, "tls")
	module := defaultModule(t, db, project.ID)

	svc := NewTLSService(db)
	if err := svc.SaveGlobalTLSSettings(models.ScopeTLSSettings{InsecureSkipVerify: true}); err != nil {
		t.Fatalf("保存全局 TLS 设置失败: %v", err)
	}

	// 接口 inherit → 跟随全局（跳过校验）
	if opts := resolveEffectiveTLS(db, module.ID, models.EndpointTLS{}); !opts.InsecureSkipVerify {
		t.Errorf("inherit 应跟随全局的跳过校验")
	}
	// 接口 strict → 强制校验
	strict := resolveEffectiveTLS(db, module.ID, models.EndpointTLS{Mode: string(models.EndpointTLSStrict)})
	if strict.InsecureSkipVerify {
		t.Errorf("strict 应强制开启证书校验")
	}

	// 项目关掉 followGlobal 且要求校验 → 覆盖全局
	if err := svc.SaveProjectTLSSettings(project.ID, models.ScopeTLSSettings{FollowGlobal: false}); err != nil {
		t.Fatalf("保存项目 TLS 设置失败: %v", err)
	}
	if opts := resolveEffectiveTLS(db, module.ID, models.EndpointTLS{}); opts.InsecureSkipVerify {
		t.Errorf("项目未跟随全局时应使用项目自身设置")
	}
}
