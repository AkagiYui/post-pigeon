package services

import (
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// resolveInheritedWSProtocolConversion 解析端点父级（文件夹链 → 模块 → 项目 → 全局）的最终开关。
// 单独返回父级结果，前端编辑接口级档位时可以即时计算而无需先保存。
func resolveInheritedWSProtocolConversion(db *gorm.DB, endpoint models.Endpoint) bool {
	path := loadRequestScopePath(db, endpoint)
	for _, folder := range path.Folders {
		switch models.NormalizeWSProtocolConversion(folder.WSProtocolConversion) {
		case models.WSProtocolConversionOn:
			return true
		case models.WSProtocolConversionOff:
			return false
		}
	}
	if path.Module.ID != "" {
		switch models.NormalizeWSProtocolConversion(path.Module.WSProtocolConversion) {
		case models.WSProtocolConversionOn:
			return true
		case models.WSProtocolConversionOff:
			return false
		}

		if path.Project.ID != "" {
			switch models.NormalizeWSProtocolConversion(path.Project.WSProtocolConversion) {
			case models.WSProtocolConversionOn:
				return true
			case models.WSProtocolConversionOff:
				return false
			}
		}
	}

	return getRequestSettings(db).AutoConvertWSProtocol
}

func resolveEffectiveWSProtocolConversion(db *gorm.DB, endpoint models.Endpoint, endpointMode string) bool {
	switch models.NormalizeWSProtocolConversion(endpointMode) {
	case models.WSProtocolConversionOn:
		return true
	case models.WSProtocolConversionOff:
		return false
	default:
		return resolveInheritedWSProtocolConversion(db, endpoint)
	}
}

// convertHTTPToWSProtocol 只替换 URL 开头的 HTTP(S) scheme，其他内容和其他协议保持原样。
func convertHTTPToWSProtocol(rawURL string, enabled bool) string {
	if !enabled {
		return rawURL
	}
	lower := strings.ToLower(rawURL)
	switch {
	case strings.HasPrefix(lower, "https://"):
		return "wss://" + rawURL[len("https://"):]
	case strings.HasPrefix(lower, "http://"):
		return "ws://" + rawURL[len("http://"):]
	default:
		return rawURL
	}
}
