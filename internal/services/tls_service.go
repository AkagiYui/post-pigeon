package services

import (
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// TLSService 管理全局与项目级 TLS 设置。
//
// 层级与代理一致：接口(inherit/strict/insecure) → 项目(followGlobal/自定义) → 全局。
// 接口级只能选择「跟随 / 强制校验 / 跳过校验」，证书这类具体材料只在项目与全局配置，
// 避免同一份证书在几十个接口上重复粘贴。
type TLSService struct {
	db *gorm.DB
}

// NewTLSService 创建 TLS 设置服务实例。
func NewTLSService(db *gorm.DB) *TLSService {
	return &TLSService{db: db}
}

// GetGlobalTLSSettings 读取全局 TLS 设置。
func (s *TLSService) GetGlobalTLSSettings() (models.ScopeTLSSettings, error) {
	return getGlobalTLSSettings(s.db), nil
}

// SaveGlobalTLSSettings 保存全局 TLS 设置。
func (s *TLSService) SaveGlobalTLSSettings(settings models.ScopeTLSSettings) error {
	models.NormalizeScopeTLSSettings(&settings, false)
	return NewSettingsService(s.db).SetSetting(models.SettingsKeyTLSGlobal, models.ToJSON(settings))
}

// GetProjectTLSSettings 读取项目 TLS 设置。未设置时默认跟随全局。
func (s *TLSService) GetProjectTLSSettings(projectID string) (models.ScopeTLSSettings, error) {
	return getProjectTLSSettings(s.db, projectID), nil
}

// SaveProjectTLSSettings 保存项目 TLS 设置。
func (s *TLSService) SaveProjectTLSSettings(projectID string, settings models.ScopeTLSSettings) error {
	models.NormalizeScopeTLSSettings(&settings, true)
	return s.db.Model(&models.Project{}).Where("id = ?", projectID).
		Update("tls_settings", models.ToJSON(settings)).Error
}

// ---- 内部：读取与规整 ----

func getGlobalTLSSettings(db *gorm.DB) models.ScopeTLSSettings {
	var settings models.ScopeTLSSettings
	raw := NewSettingsService(db).GetSetting(models.SettingsKeyTLSGlobal)
	if strings.TrimSpace(raw) != "" {
		_ = models.FromJSON(raw, &settings)
	}
	models.NormalizeScopeTLSSettings(&settings, false)
	return settings
}

func getProjectTLSSettings(db *gorm.DB, projectID string) models.ScopeTLSSettings {
	settings := models.ScopeTLSSettings{FollowGlobal: true}
	if projectID != "" {
		var proj models.Project
		if err := db.Select("tls_settings").Where("id = ?", projectID).First(&proj).Error; err == nil {
			if strings.TrimSpace(proj.TLSSettings) != "" {
				_ = models.FromJSON(proj.TLSSettings, &settings)
			}
		}
	}
	models.NormalizeScopeTLSSettings(&settings, true)
	return settings
}

// ---- TLS 解析（供 http_service / stream_service 使用）----

// resolveEffectiveTLS 解析某接口请求最终生效的 TLS 选项。
//   - 接口 strict → 强制校验证书，但仍沿用上级的 CA / 客户端证书。
//   - 接口 insecure → 跳过证书校验。
//   - 接口 inherit（默认）→ 项目（followGlobal 时落到全局）。
func resolveEffectiveTLS(db *gorm.DB, moduleID string, ep models.EndpointTLS) tlsOptions {
	scope := resolveTLSScopeChain(db, moduleID)

	opts := tlsOptions{
		InsecureSkipVerify: scope.InsecureSkipVerify,
		CACert:             scope.CACert,
		ClientCert:         scope.ClientCert,
		ClientKey:          scope.ClientKey,
		MinVersion:         scope.MinVersion,
	}
	switch ep.Mode {
	case string(models.EndpointTLSStrict):
		opts.InsecureSkipVerify = false
	case string(models.EndpointTLSInsecure):
		opts.InsecureSkipVerify = true
	}
	return opts
}

// resolveTLSScopeChain 解析「项目 → 全局」的 TLS 设置。
func resolveTLSScopeChain(db *gorm.DB, moduleID string) models.ScopeTLSSettings {
	if projectID := projectIDFromModule(db, moduleID); projectID != "" {
		proj := getProjectTLSSettings(db, projectID)
		if !proj.FollowGlobal {
			return proj
		}
	}
	return getGlobalTLSSettings(db)
}
