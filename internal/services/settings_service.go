package services

import (
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"

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
