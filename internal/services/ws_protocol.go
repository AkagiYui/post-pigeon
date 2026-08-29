package services

import (
	"strings"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// resolveInheritedWSProtocolConversion 解析端点父级（文件夹链 → 模块 → 项目 → 全局）的最终开关。
// 单独返回父级结果，前端编辑接口级档位时可以即时计算而无需先保存。
func resolveInheritedWSProtocolConversion(db *gorm.DB, endpoint models.Endpoint) bool {
	folderID := endpoint.FolderID
	for folderID != nil && *folderID != "" {
		var folder models.Folder
		if err := db.Select("parent_id", "ws_protocol_conversion").Where("id = ?", *folderID).First(&folder).Error; err != nil {
			break
		}
		switch models.NormalizeWSProtocolConversion(folder.WSProtocolConversion) {
		case models.WSProtocolConversionOn:
			return true
		case models.WSProtocolConversionOff:
			return false
		}
		folderID = folder.ParentID
	}

	var module models.Module
	if err := db.Select("project_id", "ws_protocol_conversion").Where("id = ?", endpoint.ModuleID).First(&module).Error; err == nil {
		switch models.NormalizeWSProtocolConversion(module.WSProtocolConversion) {
		case models.WSProtocolConversionOn:
			return true
		case models.WSProtocolConversionOff:
			return false
		}

		var project models.Project
		if err := db.Select("ws_protocol_conversion").Where("id = ?", module.ProjectID).First(&project).Error; err == nil {
			switch models.NormalizeWSProtocolConversion(project.WSProtocolConversion) {
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
