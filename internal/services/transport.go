package services

import (
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
)

// 本文件负责「一次请求最终使用哪个 http.Transport」。
//
// 为什么要缓存 Transport：http.Transport 自带连接池，是设计用来长期复用的。
// 每次请求新建一个，连接就永远不会被复用（TTFB 里始终包含完整的 DNS+TCP+TLS），
// 而且空闲连接会一直挂到 GC 才释放。这里按「解析后的代理 + TLS 选项」做键缓存，
// 配置相同的请求共享同一个连接池，配置变化时自然落到另一个 Transport 上。
//
// 另一个关键点是 ForceAttemptHTTP2：一旦设置了自定义的 TLSClientConfig，
// Go 就不会再自动升级到 HTTP/2，必须显式打开，否则所有 HTTPS 请求都退回 HTTP/1.1。

// resolvedProxy 是把 ProxyConfig 里的 {{变量}} 解析完成后的代理描述。
// 解析后才可作为缓存键——同一份配置在不同环境变量下可能指向不同代理。
type resolvedProxy struct {
	mode   string   // system | none | custom
	url    *url.URL // mode=custom 时的代理地址（含认证信息）
	bypass []string // mode=custom 时的 bypass 模式列表
}

// resolveProxy 解析代理条目中的变量占位符，得到可缓存的代理描述。
func resolveProxy(cfg models.ProxyConfig, vars map[string]string) resolvedProxy {
	switch cfg.Mode {
	case string(models.ProxyModeNone):
		return resolvedProxy{mode: string(models.ProxyModeNone)}
	case string(models.ProxyModeSystem):
		return resolvedProxy{mode: string(models.ProxyModeSystem)}
	case string(models.ProxyModeCustom):
		host := strings.TrimSpace(resolveVars(cfg.Host, vars))
		if host == "" {
			// 自定义代理没填主机，等同直连
			return resolvedProxy{mode: string(models.ProxyModeNone)}
		}
		scheme := "http"
		if cfg.Protocol == string(models.ProxyProtocolSOCKS5) {
			scheme = "socks5"
		}
		hostport := host
		if cfg.Port > 0 {
			hostport = net.JoinHostPort(host, fmt.Sprintf("%d", cfg.Port))
		}
		proxyURL := &url.URL{Scheme: scheme, Host: hostport}
		if cfg.Auth && cfg.Username != "" {
			proxyURL.User = url.UserPassword(resolveVars(cfg.Username, vars), resolveVars(cfg.Password, vars))
		}
		return resolvedProxy{mode: string(models.ProxyModeCustom), url: proxyURL, bypass: parseBypassList(cfg.Bypass)}
	}
	// 未知模式：按直连处理
	return resolvedProxy{mode: string(models.ProxyModeNone)}
}

// cacheKey 返回该代理描述的稳定键。
func (p resolvedProxy) cacheKey() string {
	if p.mode != string(models.ProxyModeCustom) {
		return p.mode
	}
	return "custom|" + p.url.String() + "|" + strings.Join(p.bypass, ",")
}

// proxyFunc 构建 http.Transport.Proxy 使用的函数。返回 nil 表示交由调用方决定
// （此处始终返回非 nil，直连时返回 (nil, nil) 的函数，语义比 nil 更明确）。
func (p resolvedProxy) proxyFunc() func(*http.Request) (*url.URL, error) {
	switch p.mode {
	case string(models.ProxyModeSystem):
		// 系统/环境代理：读取 HTTP(S)_PROXY / NO_PROXY 环境变量
		return http.ProxyFromEnvironment
	case string(models.ProxyModeCustom):
		proxyURL, bypass := p.url, p.bypass
		return func(req *http.Request) (*url.URL, error) {
			if hostMatchesBypass(req.URL.Hostname(), bypass) {
				return nil, nil
			}
			return proxyURL, nil
		}
	}
	return func(*http.Request) (*url.URL, error) { return nil, nil }
}

// buildProxyFunc 依据生效的代理条目构建 http.Transport.Proxy 函数。
// vars 用于解析自定义代理主机/端口/账号中的 {{变量}}。
func buildProxyFunc(cfg models.ProxyConfig, vars map[string]string) func(*http.Request) (*url.URL, error) {
	return resolveProxy(cfg, vars).proxyFunc()
}

// tlsOptions 是一次请求最终生效的 TLS 行为，同样参与 Transport 缓存键。
type tlsOptions struct {
	InsecureSkipVerify bool
	CACert             string
	ClientCert         string
	ClientKey          string
	MinVersion         string
}

// cacheKey 返回稳定键。证书内容可能很长，这里用摘要而非原文。
func (t tlsOptions) cacheKey() string {
	sum := sha256.Sum256([]byte(t.CACert + "\x00" + t.ClientCert + "\x00" + t.ClientKey))
	return fmt.Sprintf("insecure=%t|min=%s|certs=%s", t.InsecureSkipVerify, t.MinVersion, hex.EncodeToString(sum[:8]))
}

// minVersion 把配置里的版本字符串映射为 crypto/tls 常量；未配置时返回 0 表示用 Go 默认。
func (t tlsOptions) minVersion() uint16 {
	switch models.TLSMinVersion(t.MinVersion) {
	case models.TLSVersion10:
		return tls.VersionTLS10
	case models.TLSVersion11:
		return tls.VersionTLS11
	case models.TLSVersion12:
		return tls.VersionTLS12
	case models.TLSVersion13:
		return tls.VersionTLS13
	}
	return 0
}

// build 构建 *tls.Config；证书配置非法时返回带错误码的应用错误。
func (t tlsOptions) build() (*tls.Config, error) {
	cfg := &tls.Config{
		InsecureSkipVerify: t.InsecureSkipVerify, //nolint:gosec // 由用户显式开启，用于调试自签证书服务
		MinVersion:         t.minVersion(),
	}

	if strings.TrimSpace(t.CACert) != "" {
		pool, err := x509.SystemCertPool()
		if err != nil || pool == nil {
			pool = x509.NewCertPool()
		}
		if !pool.AppendCertsFromPEM([]byte(t.CACert)) {
			return nil, apperr.New(apperr.CodeTLSConfigInvalid, apperr.P("field", "caCert"))
		}
		cfg.RootCAs = pool
	}

	// 客户端证书（双向 TLS）：证书与私钥必须成对提供
	hasCert := strings.TrimSpace(t.ClientCert) != ""
	hasKey := strings.TrimSpace(t.ClientKey) != ""
	if hasCert != hasKey {
		return nil, apperr.New(apperr.CodeTLSConfigInvalid, apperr.P("field", "clientCert"))
	}
	if hasCert {
		pair, err := tls.X509KeyPair([]byte(t.ClientCert), []byte(t.ClientKey))
		if err != nil {
			return nil, apperr.Wrap(err, apperr.CodeTLSConfigInvalid, apperr.P("field", "clientCert"))
		}
		cfg.Certificates = []tls.Certificate{pair}
	}
	return cfg, nil
}

// transportCache 按「代理 + TLS」缓存 Transport，使连接池可跨请求复用。
var (
	transportMu    sync.Mutex
	transportCache = map[string]*http.Transport{}
)

// newTransport 按给定代理与 TLS 配置创建一个 Transport（不加入缓存）。
func newTransport(proxy resolvedProxy, tlsCfg *tls.Config) *http.Transport {
	return &http.Transport{
		Proxy: proxy.proxyFunc(),
		DialContext: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		// 设置了自定义 TLSClientConfig 后，必须显式开启才会协商 HTTP/2
		ForceAttemptHTTP2:     true,
		TLSClientConfig:       tlsCfg,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   16,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
}

// sharedTransport 返回与给定代理/TLS 配置对应的共享 Transport。
func sharedTransport(proxy resolvedProxy, opts tlsOptions) (*http.Transport, error) {
	key := proxy.cacheKey() + "\x00" + opts.cacheKey()

	transportMu.Lock()
	if tr, ok := transportCache[key]; ok {
		transportMu.Unlock()
		return tr, nil
	}
	transportMu.Unlock()

	tlsCfg, err := opts.build()
	if err != nil {
		return nil, err
	}
	tr := newTransport(proxy, tlsCfg)

	transportMu.Lock()
	defer transportMu.Unlock()
	// 并发下可能已被其它 goroutine 建好，复用先到者以保证「同配置同连接池」
	if existing, ok := transportCache[key]; ok {
		tr.CloseIdleConnections()
		return existing, nil
	}
	transportCache[key] = tr
	return tr, nil
}

// closeAllTransports 关闭所有缓存 Transport 的空闲连接并清空缓存。
// 应用退出时调用，避免连接悬挂。
func closeAllTransports() {
	transportMu.Lock()
	cached := make([]*http.Transport, 0, len(transportCache))
	for k, tr := range transportCache {
		cached = append(cached, tr)
		delete(transportCache, k)
	}
	transportMu.Unlock()

	for _, tr := range cached {
		tr.CloseIdleConnections()
	}
}
