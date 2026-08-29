package services

import (
	"strings"
	"time"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// requestScopePath 是一次请求所在的组织层级。Folders 始终按叶 -> 根排列，
// 所有就近覆盖型设置都沿 Endpoint -> Folders -> Module -> Project -> Global 解析。
type requestScopePath struct {
	Endpoint models.Endpoint
	Folders  []models.Folder
	Module   models.Module
	Project  models.Project
}

func loadRequestScopePath(db *gorm.DB, endpoint models.Endpoint) requestScopePath {
	path := requestScopePath{Endpoint: endpoint}
	if db == nil {
		return path
	}
	for _, id := range folderChainToRoot(db, endpoint.FolderID) {
		var folder models.Folder
		if err := db.Where("id = ?", id).First(&folder).Error; err == nil {
			path.Folders = append(path.Folders, folder)
		}
	}
	if endpoint.ModuleID != "" {
		_ = db.Where("id = ?", endpoint.ModuleID).First(&path.Module).Error
	}
	if path.Module.ProjectID != "" {
		_ = db.Where("id = ?", path.Module.ProjectID).First(&path.Project).Error
	}
	return path
}

func endpointForRequest(db *gorm.DB, endpointID, moduleID string) models.Endpoint {
	var endpoint models.Endpoint
	if db != nil && endpointID != "" {
		_ = db.Where("id = ?", endpointID).First(&endpoint).Error
	}
	if endpoint.ModuleID == "" {
		endpoint.ModuleID = moduleID
	}
	return endpoint
}

// resolveInheritedBool 解析接口编辑态以及父级的三态布尔值。
func resolveInheritedBool(path requestScopePath, endpointValue *bool, global bool,
	folderValue func(models.Folder) *bool, moduleValue func(models.Module) *bool, projectValue func(models.Project) *bool,
) bool {
	if endpointValue != nil {
		return *endpointValue
	}
	for _, folder := range path.Folders {
		if value := folderValue(folder); value != nil {
			return *value
		}
	}
	if value := moduleValue(path.Module); value != nil {
		return *value
	}
	if value := projectValue(path.Project); value != nil {
		return *value
	}
	return global
}

func resolveFollowRedirects(path requestScopePath, endpointValue *bool, global bool) bool {
	return resolveInheritedBool(path, endpointValue, global,
		func(f models.Folder) *bool { return f.FollowRedirects },
		func(m models.Module) *bool { return m.FollowRedirects },
		func(p models.Project) *bool { return p.FollowRedirects },
	)
}

func resolveSendNoCacheHeaders(path requestScopePath, endpointValue *bool, global bool) bool {
	return resolveInheritedBool(path, endpointValue, global,
		func(f models.Folder) *bool { return f.SendNoCacheHeaders },
		func(m models.Module) *bool { return m.SendNoCacheHeaders },
		func(p models.Project) *bool { return p.SendNoCacheHeaders },
	)
}

func timeoutValue(mode string, value int) (int, bool) {
	switch models.NormalizeTimeoutMode(mode) {
	case models.TimeoutUnlimited:
		return 0, true
	case models.TimeoutValue:
		return models.NormalizeScopedTimeoutValue(mode, value), true
	default:
		return 0, false
	}
}

func resolveRequestTimeout(path requestScopePath, endpointMode string, endpointValue int, global models.RequestSettings) time.Duration {
	// 兼容旧调用者：升级前 SendRequestData 只有 Timeout，正数一直表示显式接口超时。
	if strings.TrimSpace(endpointMode) == "" && endpointValue > 0 {
		return time.Duration(endpointValue) * time.Millisecond
	}
	if value, ok := timeoutValue(endpointMode, endpointValue); ok {
		return time.Duration(value) * time.Millisecond
	}
	for _, folder := range path.Folders {
		if value, ok := timeoutValue(folder.TimeoutMode, folder.Timeout); ok {
			return time.Duration(value) * time.Millisecond
		}
	}
	if value, ok := timeoutValue(path.Module.TimeoutMode, path.Module.Timeout); ok {
		return time.Duration(value) * time.Millisecond
	}
	if value, ok := timeoutValue(path.Project.TimeoutMode, path.Project.Timeout); ok {
		return time.Duration(value) * time.Millisecond
	}
	return requestTimeout(global)
}

func parseEndpointProxy(raw string) models.EndpointProxy {
	var config models.EndpointProxy
	if strings.TrimSpace(raw) != "" {
		_ = models.FromJSON(raw, &config)
	}
	return config
}

func parseEndpointTLS(raw string) models.EndpointTLS {
	var config models.EndpointTLS
	if strings.TrimSpace(raw) != "" {
		_ = models.FromJSON(raw, &config)
	}
	return config
}
