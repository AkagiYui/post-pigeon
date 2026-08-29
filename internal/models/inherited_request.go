package models

import "strings"

// TimeoutMode 表示非全局作用域的超时配置方式。
// 全局没有上级，仍使用 RequestSettings.TimeoutMs 的 nil/0/正数语义。
type TimeoutMode string

const (
	TimeoutInherit   TimeoutMode = "inherit"
	TimeoutUnlimited TimeoutMode = "unlimited"
	TimeoutValue     TimeoutMode = "value"
	// DefaultScopedTimeoutMs 是用户把某层切到“指定时长”时的安全初值。
	DefaultScopedTimeoutMs = 30000
)

// NormalizeTimeoutMode 将空值和未知值收敛为继承。
func NormalizeTimeoutMode(mode string) TimeoutMode {
	switch TimeoutMode(strings.TrimSpace(mode)) {
	case TimeoutUnlimited:
		return TimeoutUnlimited
	case TimeoutValue:
		return TimeoutValue
	default:
		return TimeoutInherit
	}
}

// NormalizeScopedTimeoutValue 保证“指定时长”不会和“不限制”混成同一个 0。
func NormalizeScopedTimeoutValue(mode string, value int) int {
	if NormalizeTimeoutMode(mode) == TimeoutValue && value <= 0 {
		return DefaultScopedTimeoutMs
	}
	if value < 0 {
		return 0
	}
	return value
}

// PersistedTimeoutMode 返回数据库使用的值；继承统一存空串。
func PersistedTimeoutMode(mode string) string {
	normalized := NormalizeTimeoutMode(mode)
	if normalized == TimeoutInherit {
		return ""
	}
	return string(normalized)
}
