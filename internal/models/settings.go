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
	SettingsKeyUpdate      = "update"       // 自动更新设置（UpdateSettings 的 JSON）
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
	// TimeoutMs 请求超时时间（毫秒），仅在接口自身未设置超时时兜底。
	// 三态：nil 表示未设置（按 DefaultRequestTimeoutMs 处理），0 表示不限制超时，正数为具体时长。
	TimeoutMs *int `json:"timeoutMs,omitempty"`
	// FollowRedirects 是否自动跟随 3xx 重定向，默认开启。
	// 这是全局开关：关掉之后所有请求都不跟随，接口级开关只能在其之上再关，不能反向打开。
	FollowRedirects bool `json:"followRedirects"`
	// SendNoCacheHeaders 为每个请求补上 Cache-Control: no-cache，默认关闭。
	// 请求自己显式带了 Cache-Control 时不覆盖。
	SendNoCacheHeaders bool `json:"sendNoCacheHeaders"`
	// AllowJSONComments 兼容带注释的 JSON（JSONC）：JSON 请求体里的 `//`、`/* */` 注释
	// 与尾随逗号在发送、导出 cURL 之前自动去掉，默认开启。
	// 只有「原文不是合法 JSON、去掉之后是合法 JSON」时才会改写，正确的请求体不受影响。
	AllowJSONComments bool `json:"allowJsonComments"`
	// UserAgent 请求默认携带的 User-Agent，留空则用 DefaultUserAgent。
	// 只在请求自身没有 User-Agent 请求头时才补：接口上显式写了（含显式留空以抑制该头）就以接口为准。
	UserAgent string `json:"userAgent"`
}

// DefaultUserAgent 未自定义 User-Agent 时请求默认携带的值。
const DefaultUserAgent = "PostPigeon/1.0.0 (https://github.com/AkagiYui/PostPigeon)"

// DefaultRequestTimeoutMs 请求超时的默认值（毫秒），对应设置项未设置（留空）的情况。
const DefaultRequestTimeoutMs = 300000

// HistorySettings 请求历史的保留策略。
type HistorySettings struct {
	// RetentionDays 保留天数，超过则清理。0 表示永久保留。
	RetentionDays int `json:"retentionDays"`
	// MaxRowsPerModule 单个模块保留的最大条数，超出则淘汰最旧的。0 表示不限制。
	MaxRowsPerModule int `json:"maxRowsPerModule"`
	// MaskSensitive 写入历史时对凭据类请求头与秘密变量值脱敏，默认开启。
	// 历史库里存的是长期有效的 token，数据库文件被拷走就等于凭据泄漏。
	MaskSensitive bool `json:"maskSensitive"`
}

// UpdateSettings 自动更新相关设置。
type UpdateSettings struct {
	// AutoCheck 启动后与运行期间定时向 GitHub Releases 检查新版本。
	// 只检查不下载：是否下载安装始终由用户点击决定。
	AutoCheck bool `json:"autoCheck"`
	// IncludePrerelease 是否接收预发布版本（tag 里带 - 的版本）。
	IncludePrerelease bool `json:"includePrerelease"`
	// SkippedVersion 用户点「跳过此版本」记录的版本号。Wails 的 updater 只在
	// 内存里记这个值，所以要持久化到这里，并在应用启动时回填。
	SkippedVersion string `json:"skippedVersion"`
}

// 默认限额：32MiB 响应上限、1MiB 入库上限、32MiB WebSocket 单帧上限，
// 历史保留 30 天且单模块最多 2000 条。
var (
	DefaultRequestSettings = RequestSettings{
		MaxResponseBytes:         32 << 20,
		MaxStoredBodyBytes:       1 << 20,
		MaxWebSocketMessageBytes: 32 << 20,
		FollowRedirects:          true,
		SendNoCacheHeaders:       false,
		AllowJSONComments:        true,
	}
	DefaultHistorySettings = HistorySettings{
		RetentionDays:    30,
		MaxRowsPerModule: 2000,
		MaskSensitive:    true,
	}
	// 默认自动检查更新、只收正式版本
	DefaultUpdateSettings = UpdateSettings{
		AutoCheck:         true,
		IncludePrerelease: false,
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
func ToJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		slog.Error("JSON序列化失败", "error", err)
		return ""
	}
	return string(b)
}

// FromJSON 从 JSON 字符串反序列化
func FromJSON(s string, v any) error {
	return json.Unmarshal([]byte(s), v)
}
