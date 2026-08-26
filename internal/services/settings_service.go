package services

import (
	"PostPigeon/internal/models"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"
)

// SettingsService 设置管理服务
type SettingsService struct {
	db *gorm.DB
}

// NewSettingsService 创建设置服务实例
func NewSettingsService(db *gorm.DB) *SettingsService {
	return &SettingsService{db: db}
}

// GetSetting 获取设置值
func (s *SettingsService) GetSetting(key string) string {
	var setting models.Settings
	result := s.db.Where("key = ?", key).First(&setting)
	if result.Error != nil {
		// 返回默认值
		if defaultVal, ok := models.DefaultSettings[key]; ok {
			return defaultVal
		}
		return ""
	}
	return setting.Value
}

// SetSetting 设置值（upsert）
func (s *SettingsService) SetSetting(key string, value string) error {
	var setting models.Settings
	result := s.db.Where("key = ?", key).First(&setting)

	if result.Error == gorm.ErrRecordNotFound {
		setting = models.Settings{Key: key, Value: value}
		if err := s.db.Create(&setting).Error; err != nil {
			slog.Error("保存设置失败", "key", key, "error", err)
			return fmt.Errorf("保存设置失败: %w", err)
		}
		return nil
	}

	if result.Error != nil {
		return result.Error
	}

	return s.db.Model(&setting).Update("value", value).Error
}

// GetAllSettings 获取所有设置
func (s *SettingsService) GetAllSettings() (map[string]string, error) {
	var settings []models.Settings
	if err := s.db.Find(&settings).Error; err != nil {
		return nil, fmt.Errorf("获取设置失败: %w", err)
	}

	result := make(map[string]string)
	// 先填充默认值
	for k, v := range models.DefaultSettings {
		result[k] = v
	}
	// 用数据库值覆盖
	for _, s := range settings {
		result[s.Key] = s.Value
	}

	return result, nil
}

// GetThemeMode 获取主题模式
func (s *SettingsService) GetThemeMode() string {
	return s.GetSetting(models.SettingsKeyThemeMode)
}

// SetThemeMode 设置主题模式
func (s *SettingsService) SetThemeMode(mode string) error {
	return s.SetSetting(models.SettingsKeyThemeMode, mode)
}

// GetThemeAccent 获取主题色
func (s *SettingsService) GetThemeAccent() string {
	return s.GetSetting(models.SettingsKeyThemeAccent)
}

// SetThemeAccent 设置主题色
func (s *SettingsService) SetThemeAccent(accent string) error {
	return s.SetSetting(models.SettingsKeyThemeAccent, accent)
}

// GetLanguage 获取语言设置
func (s *SettingsService) GetLanguage() string {
	lang := s.GetSetting(models.SettingsKeyLanguage)
	if lang == "" {
		// 默认返回系统语言
		return "system"
	}
	return lang
}

// SetLanguage 设置语言
func (s *SettingsService) SetLanguage(lang string) error {
	return s.SetSetting(models.SettingsKeyLanguage, lang)
}

// GetUIScale 获取界面缩放比例
func (s *SettingsService) GetUIScale() string {
	return s.GetSetting(models.SettingsKeyUIScale)
}

// SetUIScale 设置界面缩放比例
func (s *SettingsService) SetUIScale(scale string) error {
	return s.SetSetting(models.SettingsKeyUIScale, scale)
}

// ---- 资源限额与历史保留策略 ----

// GetRequestSettings 读取请求限额设置；未配置或字段为负时回落到默认值。
func (s *SettingsService) GetRequestSettings() (models.RequestSettings, error) {
	return getRequestSettings(s.db), nil
}

// SaveRequestSettings 保存请求限额设置。
func (s *SettingsService) SaveRequestSettings(settings models.RequestSettings) error {
	normalizeRequestSettings(&settings)
	return s.SetSetting(models.SettingsKeyRequest, models.ToJSON(settings))
}

// GetHistorySettings 读取请求历史保留策略。
func (s *SettingsService) GetHistorySettings() (models.HistorySettings, error) {
	return getHistorySettings(s.db), nil
}

// SaveHistorySettings 保存请求历史保留策略。
func (s *SettingsService) SaveHistorySettings(settings models.HistorySettings) error {
	if settings.RetentionDays < 0 {
		settings.RetentionDays = 0
	}
	if settings.MaxRowsPerModule < 0 {
		settings.MaxRowsPerModule = 0
	}
	return s.SetSetting(models.SettingsKeyHistory, models.ToJSON(settings))
}

// getRequestSettings 读取请求限额；无记录时返回默认值。
func getRequestSettings(db *gorm.DB) models.RequestSettings {
	settings := models.DefaultRequestSettings
	raw := NewSettingsService(db).GetSetting(models.SettingsKeyRequest)
	if raw != "" {
		_ = models.FromJSON(raw, &settings)
	}
	normalizeRequestSettings(&settings)
	return settings
}

// getHistorySettings 读取历史保留策略；无记录时返回默认值。
func getHistorySettings(db *gorm.DB) models.HistorySettings {
	settings := models.DefaultHistorySettings
	raw := NewSettingsService(db).GetSetting(models.SettingsKeyHistory)
	if raw != "" {
		_ = models.FromJSON(raw, &settings)
	}
	if settings.RetentionDays < 0 {
		settings.RetentionDays = 0
	}
	if settings.MaxRowsPerModule < 0 {
		settings.MaxRowsPerModule = 0
	}
	return settings
}

// normalizeRequestSettings 把负值统一按「不限制」处理。
func normalizeRequestSettings(s *models.RequestSettings) {
	if s.MaxResponseBytes < 0 {
		s.MaxResponseBytes = 0
	}
	if s.MaxStoredBodyBytes < 0 {
		s.MaxStoredBodyBytes = 0
	}
	if s.MaxWebSocketMessageBytes < 0 {
		s.MaxWebSocketMessageBytes = 0
	}
	// 0 表示不限制超时；负数是非法输入，按「未设置」处理而不是「永不超时」
	if s.TimeoutMs != nil && *s.TimeoutMs < 0 {
		s.TimeoutMs = nil
	}
}

// requestTimeout 返回全局设置里的请求超时兜底值：
// 未设置时用默认值，显式设为 0 则返回 0（表示不限制超时）。
func requestTimeout(s models.RequestSettings) time.Duration {
	if s.TimeoutMs == nil {
		return models.DefaultRequestTimeoutMs * time.Millisecond
	}
	if *s.TimeoutMs <= 0 {
		return 0
	}
	return time.Duration(*s.TimeoutMs) * time.Millisecond
}
