package models

// ProxyMode 代理条目的模式。
type ProxyMode string

const (
	// ProxyModeSystem 使用系统/环境代理（读取 HTTP(S)_PROXY / NO_PROXY 环境变量）。
	ProxyModeSystem ProxyMode = "system"
	// ProxyModeNone 直连，不使用任何代理。
	ProxyModeNone ProxyMode = "none"
	// ProxyModeCustom 自定义代理（http / socks5，可含身份验证与 bypass 列表）。
	ProxyModeCustom ProxyMode = "custom"
)

// ProxyProtocol 自定义代理的协议。
type ProxyProtocol string

const (
	ProxyProtocolHTTP   ProxyProtocol = "http"
	ProxyProtocolSOCKS5 ProxyProtocol = "socks5"
)

// 内置代理条目 ID：系统代理与不使用代理在每个作用域中始终存在且不可删除。
const (
	ProxyBuiltinSystemID = "system"
	ProxyBuiltinNoneID   = "none"
)

// ProxyConfig 单个代理条目。系统/不使用代理为内置条目，自定义条目由用户新增。
type ProxyConfig struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Mode: system | none | custom
	Mode string `json:"mode"`
	// 以下字段仅在 Mode=custom 时有效
	Protocol string `json:"protocol"` // http | socks5
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Auth     bool   `json:"auth"` // 是否启用身份验证
	Username string `json:"username"`
	Password string `json:"password"`
	// Bypass 不走代理的主机列表（逗号/换行/空格分隔，支持后缀与 * 通配）。
	Bypass string `json:"bypass"`
}

// ScopeProxySettings 某作用域（全局或项目）的代理设置：一组代理条目 + 当前选中的默认条目。
type ScopeProxySettings struct {
	// FollowGlobal 仅项目级有意义：为 true 时项目跟随全局设置（默认）。全局级忽略此字段。
	FollowGlobal bool `json:"followGlobal"`
	// ActiveID 当前生效的默认代理条目 ID（在 Proxies 中）。
	ActiveID string `json:"activeId"`
	// Proxies 代理条目列表（含内置的 system / none 及用户自定义条目）。
	Proxies []ProxyConfig `json:"proxies"`
}

// EndpointProxyMode 接口级代理选择的模式。
type EndpointProxyMode string

const (
	// EndpointProxyInherit 跟随项目设置（默认）。
	EndpointProxyInherit EndpointProxyMode = "inherit"
	// EndpointProxyNone 不使用代理（直连）。
	EndpointProxyNone EndpointProxyMode = "none"
	// EndpointProxyRef 引用项目或全局中的某一个代理条目（不可自定义）。
	EndpointProxyRef EndpointProxyMode = "ref"
)

// 引用作用域。
const (
	ProxyScopeGlobal  = "global"
	ProxyScopeProject = "project"
)

// EndpointProxy 接口级代理选择。存于 endpoints.proxy_config（JSON）。
type EndpointProxy struct {
	// Mode: inherit | none | ref
	Mode string `json:"mode"`
	// RefScope: global | project（Mode=ref 时有效）
	RefScope string `json:"refScope"`
	// RefID 被引用代理条目的 ID（Mode=ref 时有效）
	RefID string `json:"refId"`
}

// SelectableProxy 供接口下拉选择的扁平代理条目（合并项目与全局的可选代理）。
type SelectableProxy struct {
	Scope string `json:"scope"` // global | project
	ID    string `json:"id"`
	Name  string `json:"name"`
	Mode  string `json:"mode"`
}

// BuiltinProxies 返回某作用域始终存在的内置条目（系统代理、不使用代理）。
func BuiltinProxies() []ProxyConfig {
	return []ProxyConfig{
		{ID: ProxyBuiltinSystemID, Name: "系统代理", Mode: string(ProxyModeSystem)},
		{ID: ProxyBuiltinNoneID, Name: "不使用代理", Mode: string(ProxyModeNone)},
	}
}

// NormalizeScopeProxySettings 规整作用域代理设置：确保内置条目存在（置顶）、
// 去除重复的内置条目、保证 ActiveID 指向存在的条目。isProject 为 true 时保留 FollowGlobal 语义。
func NormalizeScopeProxySettings(s *ScopeProxySettings, isProject bool) {
	// 收集用户自定义条目（跳过与内置同 ID 的项，内置将统一重建）
	custom := make([]ProxyConfig, 0, len(s.Proxies))
	for _, p := range s.Proxies {
		if p.ID == ProxyBuiltinSystemID || p.ID == ProxyBuiltinNoneID || p.ID == "" {
			continue
		}
		// 仅接受自定义模式的用户条目
		p.Mode = string(ProxyModeCustom)
		custom = append(custom, p)
	}
	s.Proxies = append(BuiltinProxies(), custom...)

	// 校验 ActiveID：不存在则回退到系统代理
	if !proxyExists(s.Proxies, s.ActiveID) {
		s.ActiveID = ProxyBuiltinSystemID
	}
	if !isProject {
		s.FollowGlobal = false
	}
}

// proxyExists 判断给定 ID 是否存在于列表中。
func proxyExists(list []ProxyConfig, id string) bool {
	for _, p := range list {
		if p.ID == id {
			return true
		}
	}
	return false
}

// FindProxy 按 ID 在列表中查找代理条目。
func FindProxy(list []ProxyConfig, id string) (ProxyConfig, bool) {
	for _, p := range list {
		if p.ID == id {
			return p, true
		}
	}
	return ProxyConfig{}, false
}
