package models

// TLS 设置沿用与代理一致的三级模型：全局 → 项目（可跟随全局）→ 接口（inherit/strict/insecure）。
// 目的是让「自签证书的内网服务」「需要双向认证的接口」这类调试场景不必关掉整个应用的校验。

// TLSMinVersion 允许的最低 TLS 版本。空串表示使用 Go 默认（当前为 TLS 1.2）。
type TLSMinVersion string

const (
	TLSVersionDefault TLSMinVersion = ""
	TLSVersion10      TLSMinVersion = "1.0"
	TLSVersion11      TLSMinVersion = "1.1"
	TLSVersion12      TLSMinVersion = "1.2"
	TLSVersion13      TLSMinVersion = "1.3"
)

// ScopeTLSSettings 某作用域（全局或项目）的 TLS 设置。
type ScopeTLSSettings struct {
	// FollowGlobal 仅项目级有意义：为 true 时项目跟随全局设置（默认）。
	FollowGlobal bool `json:"followGlobal"`
	// InsecureSkipVerify 跳过服务端证书校验（调试自签证书用，生产慎用）。
	InsecureSkipVerify bool `json:"insecureSkipVerify"`
	// CACert 追加信任的 CA 证书（PEM，可含多张）。
	CACert string `json:"caCert"`
	// ClientCert / ClientKey 客户端证书与私钥（PEM），用于双向 TLS。
	ClientCert string `json:"clientCert"`
	ClientKey  string `json:"clientKey"`
	// MinVersion 最低 TLS 版本，见 TLSMinVersion。
	MinVersion string `json:"minVersion"`
}

// EndpointTLSMode 接口级 TLS 选择的模式。
type EndpointTLSMode string

const (
	// EndpointTLSInherit 跟随项目/全局设置（默认）。
	EndpointTLSInherit EndpointTLSMode = "inherit"
	// EndpointTLSStrict 强制开启证书校验，忽略上级的 insecure 设置。
	EndpointTLSStrict EndpointTLSMode = "strict"
	// EndpointTLSInsecure 本接口跳过证书校验。
	EndpointTLSInsecure EndpointTLSMode = "insecure"
)

// EndpointTLS 接口级 TLS 选择。存于 endpoints.tls_config（JSON）。
type EndpointTLS struct {
	// Mode: inherit | strict | insecure
	Mode string `json:"mode"`
}

// NormalizeScopeTLSSettings 规整作用域 TLS 设置。
func NormalizeScopeTLSSettings(s *ScopeTLSSettings, isProject bool) {
	switch TLSMinVersion(s.MinVersion) {
	case TLSVersion10, TLSVersion11, TLSVersion12, TLSVersion13:
	default:
		s.MinVersion = string(TLSVersionDefault)
	}
	if !isProject {
		s.FollowGlobal = false
	}
}
