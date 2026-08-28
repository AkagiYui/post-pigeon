package services

import (
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// 请求历史会把请求头与请求/响应体原样存进本地数据库，其中往往带着
// Authorization、Cookie、API Key 这类长期有效的凭据。数据库文件被拷走、
// 或项目被导出分享时，这些凭据就跟着泄漏了。默认对它们做脱敏。

// maskedPlaceholder 是脱敏后的占位文本。
const maskedPlaceholder = "***"

// sensitiveHeaderNames 是默认脱敏的请求/响应头（小写比较）。
var sensitiveHeaderNames = map[string]bool{
	"authorization":       true,
	"proxy-authorization": true,
	"cookie":              true,
	"set-cookie":          true,
	"x-api-key":           true,
	"api-key":             true,
	"apikey":              true,
	"x-auth-token":        true,
	"x-access-token":      true,
	"x-csrf-token":        true,
	"token":               true,
}

// isSensitiveHeader 判断某个头是否应脱敏。
func isSensitiveHeader(name string) bool {
	return sensitiveHeaderNames[strings.ToLower(strings.TrimSpace(name))]
}

// maskHeaders 返回脱敏后的头副本；原 map 不被修改。
func maskHeaders(headers map[string]string) map[string]string {
	out := make(map[string]string, len(headers))
	for name, value := range headers {
		if isSensitiveHeader(name) {
			out[name] = maskedPlaceholder
		} else {
			out[name] = value
		}
	}
	return out
}

// maskMultiHeaders 是 maskHeaders 的多值版本（http.Header 形态）。
func maskMultiHeaders(headers map[string][]string) map[string][]string {
	out := make(map[string][]string, len(headers))
	for name, values := range headers {
		if isSensitiveHeader(name) {
			out[name] = []string{maskedPlaceholder}
			continue
		}
		copied := make([]string, len(values))
		copy(copied, values)
		out[name] = copied
	}
	return out
}

// maskSecretValues 把文本中出现的秘密变量值替换为占位符。
// 只处理足够长的值：太短的值（如 "1"）会在正文里到处误伤。
func maskSecretValues(text string, secrets []string) string {
	if text == "" || len(secrets) == 0 {
		return text
	}
	out := text
	for _, secret := range secrets {
		if len(secret) < 6 {
			continue
		}
		out = strings.ReplaceAll(out, secret, maskedPlaceholder)
	}
	return out
}

// collectSecretValues 收集该请求可见的秘密变量值（环境变量与模块变量中标记为 secret 的）。
func collectSecretValues(db *gorm.DB, environmentID, moduleID string) []string {
	if db == nil {
		return nil
	}
	out := []string{}
	appendValue := func(v string) {
		if strings.TrimSpace(v) != "" {
			out = append(out, v)
		}
	}
	if environmentID != "" {
		var vars []models.EnvironmentVariable
		if err := db.Where("environment_id = ? AND is_secret = ?", environmentID, true).Find(&vars).Error; err == nil {
			for _, item := range vars {
				appendValue(item.Value)
			}
		}
	}
	if moduleID != "" {
		var vars []models.ModuleVariable
		if err := db.Where("module_id = ? AND is_secret = ?", moduleID, true).Find(&vars).Error; err == nil {
			for _, item := range vars {
				appendValue(item.Value)
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
