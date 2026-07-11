package services

import (
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// ProxyService 代理设置服务：管理全局与项目级代理设置，并为接口提供可选代理列表。
//
// 层级：接口(inherit/none/ref) → 项目(followGlobal/自选) → 全局(自选)。
// 全局与项目均维护一组代理条目（含内置的「系统代理」「不使用代理」及自定义条目），
// 各自选择一个默认条目；接口只能引用项目/全局中已有的条目，不能自定义。
type ProxyService struct {
	db *gorm.DB
}

// NewProxyService 创建代理服务实例
func NewProxyService(db *gorm.DB) *ProxyService {
	return &ProxyService{db: db}
}

// GetGlobalProxySettings 读取全局代理设置（已规整，内置条目始终存在）。
func (s *ProxyService) GetGlobalProxySettings() (models.ScopeProxySettings, error) {
	return getGlobalProxySettings(s.db), nil
}

// SaveGlobalProxySettings 保存全局代理设置。
func (s *ProxyService) SaveGlobalProxySettings(settings models.ScopeProxySettings) error {
	models.NormalizeScopeProxySettings(&settings, false)
	svc := NewSettingsService(s.db)
	return svc.SetSetting(models.SettingsKeyProxyGlobal, models.ToJSON(settings))
}

// GetProjectProxySettings 读取项目代理设置（已规整）。空/未设置时默认跟随全局。
func (s *ProxyService) GetProjectProxySettings(projectID string) (models.ScopeProxySettings, error) {
	return getProjectProxySettings(s.db, projectID), nil
}

// SaveProjectProxySettings 保存项目代理设置。
func (s *ProxyService) SaveProjectProxySettings(projectID string, settings models.ScopeProxySettings) error {
	models.NormalizeScopeProxySettings(&settings, true)
	return s.db.Model(&models.Project{}).Where("id = ?", projectID).
		Update("proxy_settings", models.ToJSON(settings)).Error
}

// ListSelectableProxies 返回接口下拉可选的代理条目：先项目、后全局（均含内置条目）。
// 接口只能引用其中之一（或选择 inherit / none）。
func (s *ProxyService) ListSelectableProxies(projectID string) ([]models.SelectableProxy, error) {
	out := make([]models.SelectableProxy, 0, 8)
	if projectID != "" {
		proj := getProjectProxySettings(s.db, projectID)
		for _, p := range proj.Proxies {
			out = append(out, models.SelectableProxy{Scope: models.ProxyScopeProject, ID: p.ID, Name: p.Name, Mode: p.Mode})
		}
	}
	global := getGlobalProxySettings(s.db)
	for _, p := range global.Proxies {
		out = append(out, models.SelectableProxy{Scope: models.ProxyScopeGlobal, ID: p.ID, Name: p.Name, Mode: p.Mode})
	}
	return out, nil
}

// ---- 内部：读取与规整 ----

func getGlobalProxySettings(db *gorm.DB) models.ScopeProxySettings {
	var settings models.ScopeProxySettings
	raw := NewSettingsService(db).GetSetting(models.SettingsKeyProxyGlobal)
	if strings.TrimSpace(raw) != "" {
		_ = models.FromJSON(raw, &settings)
	}
	models.NormalizeScopeProxySettings(&settings, false)
	return settings
}

func getProjectProxySettings(db *gorm.DB, projectID string) models.ScopeProxySettings {
	settings := models.ScopeProxySettings{FollowGlobal: true}
	if projectID != "" {
		var proj models.Project
		if err := db.Select("proxy_settings").Where("id = ?", projectID).First(&proj).Error; err == nil {
			if strings.TrimSpace(proj.ProxySettings) != "" {
				_ = models.FromJSON(proj.ProxySettings, &settings)
			}
		}
	}
	models.NormalizeScopeProxySettings(&settings, true)
	return settings
}

// ---- 代理解析（供 http_service 使用）----

// resolveEffectiveProxy 解析某接口请求最终生效的代理条目。
//   - 接口 inherit（默认）→ 解析项目链；项目 followGlobal → 全局默认条目。
//   - 接口 none → 不使用代理。
//   - 接口 ref → 引用项目/全局中的具体条目；引用失效时回退到 inherit 链。
//
// moduleID 用于定位所属项目；为空（未保存请求）时项目链不可用，直接落到全局。
func resolveEffectiveProxy(db *gorm.DB, moduleID string, ep models.EndpointProxy) models.ProxyConfig {
	switch ep.Mode {
	case string(models.EndpointProxyNone):
		return models.ProxyConfig{ID: models.ProxyBuiltinNoneID, Mode: string(models.ProxyModeNone)}
	case string(models.EndpointProxyRef):
		if cfg, ok := lookupScopeProxy(db, moduleID, ep.RefScope, ep.RefID); ok {
			return cfg
		}
		// 引用失效：回退到 inherit 链
	}
	// inherit（空或 "inherit"）与 ref 回退：解析项目/全局链
	return resolveScopeChain(db, moduleID)
}

// resolveScopeChain 解析「项目 → 全局」的默认代理条目。
func resolveScopeChain(db *gorm.DB, moduleID string) models.ProxyConfig {
	projectID := projectIDFromModule(db, moduleID)
	if projectID != "" {
		proj := getProjectProxySettings(db, projectID)
		if !proj.FollowGlobal {
			if cfg, ok := models.FindProxy(proj.Proxies, proj.ActiveID); ok {
				return cfg
			}
		}
	}
	global := getGlobalProxySettings(db)
	if cfg, ok := models.FindProxy(global.Proxies, global.ActiveID); ok {
		return cfg
	}
	// 兜底：系统代理
	return models.ProxyConfig{ID: models.ProxyBuiltinSystemID, Mode: string(models.ProxyModeSystem)}
}

// lookupScopeProxy 在指定作用域的代理列表中按 ID 查找条目。
func lookupScopeProxy(db *gorm.DB, moduleID, scope, id string) (models.ProxyConfig, bool) {
	switch scope {
	case models.ProxyScopeProject:
		projectID := projectIDFromModule(db, moduleID)
		if projectID == "" {
			return models.ProxyConfig{}, false
		}
		return models.FindProxy(getProjectProxySettings(db, projectID).Proxies, id)
	case models.ProxyScopeGlobal:
		return models.FindProxy(getGlobalProxySettings(db).Proxies, id)
	}
	return models.ProxyConfig{}, false
}

// projectIDFromModule 由模块 ID 反查项目 ID；moduleID 为空或查不到时返回空串。
func projectIDFromModule(db *gorm.DB, moduleID string) string {
	if moduleID == "" {
		return ""
	}
	var module models.Module
	if err := db.Select("project_id").Where("id = ?", moduleID).First(&module).Error; err != nil {
		return ""
	}
	return module.ProjectID
}

// buildProxyFunc 依据生效的代理条目构建 http.Transport.Proxy 函数。
// vars 用于解析自定义代理主机/端口/账号中的 {{变量}}。返回 nil 表示直连（不使用代理）。
func buildProxyFunc(cfg models.ProxyConfig, vars map[string]string) func(*http.Request) (*url.URL, error) {
	switch cfg.Mode {
	case string(models.ProxyModeNone):
		return func(*http.Request) (*url.URL, error) { return nil, nil }
	case string(models.ProxyModeSystem):
		// 系统/环境代理：读取 HTTP(S)_PROXY / NO_PROXY 环境变量
		return http.ProxyFromEnvironment
	case string(models.ProxyModeCustom):
		host := strings.TrimSpace(resolveVars(cfg.Host, vars))
		if host == "" {
			return func(*http.Request) (*url.URL, error) { return nil, nil }
		}
		scheme := "http"
		if cfg.Protocol == string(models.ProxyProtocolSOCKS5) {
			scheme = "socks5"
		}
		portStr := strings.TrimSpace(resolveVars(strconv.Itoa(cfg.Port), vars))
		hostport := host
		if portStr != "" && portStr != "0" {
			hostport = net.JoinHostPort(host, portStr)
		}
		proxyURL := &url.URL{Scheme: scheme, Host: hostport}
		if cfg.Auth && cfg.Username != "" {
			proxyURL.User = url.UserPassword(resolveVars(cfg.Username, vars), resolveVars(cfg.Password, vars))
		}
		bypass := parseBypassList(cfg.Bypass)
		return func(req *http.Request) (*url.URL, error) {
			if hostMatchesBypass(req.URL.Hostname(), bypass) {
				return nil, nil
			}
			return proxyURL, nil
		}
	}
	// 未知模式：直连
	return nil
}

// parseBypassList 将 bypass 文本（逗号/换行/空格分隔）拆分为规整后的模式列表。
func parseBypassList(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	fields := strings.FieldsFunc(s, func(r rune) bool {
		return r == ',' || r == '\n' || r == '\r' || r == ' ' || r == '\t' || r == ';'
	})
	out := make([]string, 0, len(fields))
	for _, f := range fields {
		f = strings.TrimSpace(strings.ToLower(f))
		if f != "" {
			out = append(out, f)
		}
	}
	return out
}

// hostMatchesBypass 判断主机是否命中 bypass 列表。
// 支持：精确匹配、"*"（全部）、前缀 "*."/"." 的后缀匹配，以及裸域名的自身+子域匹配。
func hostMatchesBypass(host string, patterns []string) bool {
	if host == "" || len(patterns) == 0 {
		return false
	}
	host = strings.ToLower(host)
	for _, p := range patterns {
		switch {
		case p == "*":
			return true
		case strings.HasPrefix(p, "*."):
			suffix := p[1:] // ".domain.com"
			if strings.HasSuffix(host, suffix) || host == p[2:] {
				return true
			}
		case strings.HasPrefix(p, "."):
			if strings.HasSuffix(host, p) || host == p[1:] {
				return true
			}
		default:
			if host == p || strings.HasSuffix(host, "."+p) {
				return true
			}
		}
	}
	return false
}
