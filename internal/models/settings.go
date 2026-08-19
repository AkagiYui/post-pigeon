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

// 窗口状态，记录窗口位置和大小
type WindowState struct {
	X           int  `json:"x"`           // 窗口左上角 X 坐标
	Y           int  `json:"y"`           // 窗口左上角 Y 坐标
	Width       int  `json:"width"`       // 窗口宽度
	Height      int  `json:"height"`      // 窗口高度
	IsMaximised bool `json:"isMaximised"` // 是否已最大化
}

// 预定义的设置键
const (
	SettingsKeyThemeMode   = "theme.mode"   // light, dark, system
	SettingsKeyThemeAccent = "theme.accent" // teal, blue, violet, rose, orange
	SettingsKeyLanguage    = "language"     // zh-CN, en
	SettingsKeyUIScale     = "ui.scale"     // 0.8, 0.9, 1.0, 1.1, 1.25, 1.5
	SettingsKeyWindowState = "window.state" // 窗口位置和大小
	SettingsKeyProxyGlobal = "proxy.global" // 全局代理设置（ScopeProxySettings 的 JSON）
	SettingsKeyTLSGlobal   = "tls.global"   // 全局 TLS 设置（ScopeTLSSettings 的 JSON）
	SettingsKeyRequest     = "request"      // 请求相关限额（RequestSettings 的 JSON）
	SettingsKeyHistory     = "history"      // 请求历史保留策略（HistorySettings 的 JSON）
)

// RequestSettings 请求相关的资源限额。
type RequestSettings struct {
	// MaxResponseBytes 单次响应体最大读取字节数，超出部分丢弃并在响应上标记截断。
	// 0 表示不限制（不推荐：大文件接口会把整个响应读进内存）。
	MaxResponseBytes int64 `json:"maxResponseBytes"`
	// MaxStoredBodyBytes 写入数据库（响应快照 / 请求历史）的响应体最大字节数，
	// 超出则截断后存储，避免数据库被单个大响应撑爆。0 表示不限制。
	MaxStoredBodyBytes int64 `json:"maxStoredBodyBytes"`
	// MaxWebSocketMessageBytes WebSocket 单帧最大字节数，0 表示不限制。
	MaxWebSocketMessageBytes int64 `json:"maxWebSocketMessageBytes"`
}

// HistorySettings 请求历史的保留策略。
type HistorySettings struct {
	// RetentionDays 保留天数，超过则清理。0 表示永久保留。
	RetentionDays int `json:"retentionDays"`
	// MaxRowsPerModule 单个模块保留的最大条数，超出则淘汰最旧的。0 表示不限制。
	MaxRowsPerModule int `json:"maxRowsPerModule"`
}

// 默认限额：32MiB 响应上限、1MiB 入库上限、32MiB WebSocket 单帧上限，
// 历史保留 30 天且单模块最多 2000 条。
var (
	DefaultRequestSettings = RequestSettings{
		MaxResponseBytes:         32 << 20,
		MaxStoredBodyBytes:       1 << 20,
		MaxWebSocketMessageBytes: 32 << 20,
	}
	DefaultHistorySettings = HistorySettings{
		RetentionDays:    30,
		MaxRowsPerModule: 2000,
	}
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
