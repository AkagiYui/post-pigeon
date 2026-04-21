package models

import (
	"encoding/json"
	"log/slog"
)

// Settings 应用设置，键值对存储
type Settings struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"` // JSON 格式
}

// 预定义的设置键
const (
	SettingsKeyThemeMode   = "theme.mode"   // light, dark, system
	SettingsKeyThemeAccent = "theme.accent" // teal, blue, violet, rose, orange
	SettingsKeyLanguage    = "language"     // zh-CN, en
	SettingsKeyUIScale     = "ui.scale"     // 0.8, 0.9, 1.0, 1.1, 1.25, 1.5
)

// DefaultSettings 默认设置值
var DefaultSettings = map[string]string{
	SettingsKeyThemeMode:   "system",
	SettingsKeyThemeAccent: "teal",
	SettingsKeyLanguage:    "",
	SettingsKeyUIScale:     "1.0",
}

// ToJSON 将值序列化为 JSON 字符串
func ToJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		slog.Error("JSON序列化失败", "error", err)
		return ""
	}
	return string(b)
}

// FromJSON 从 JSON 字符串反序列化
func FromJSON(s string, v interface{}) error {
	return json.Unmarshal([]byte(s), v)
}
