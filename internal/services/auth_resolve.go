package services

import (
	"net/http"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// scopeAuth 表示某层级（文件夹/模块）的认证配置。
type scopeAuth struct {
	Type string
	Data string
}

// resolveEffectiveAuth 解析端点的有效认证：当端点认证为空或 inherit 时，
// 依次向上查找文件夹链、模块的认证配置，返回第一个非 none/非 inherit 的认证。
func resolveEffectiveAuth(db *gorm.DB, ep *models.Endpoint, epAuth *models.EndpointAuth) *models.EndpointAuth {
	// 端点自身有明确认证（非 inherit、非空）
	if epAuth != nil && epAuth.Type != "" &&
		epAuth.Type != string(models.AuthTypeInherit) {
		return epAuth
	}

	// 向上查找文件夹链
	for _, fid := range folderChainToRoot(db, ep.FolderID) {
		var f models.Folder
		if err := db.Select("auth_type", "auth_data").Where("id = ?", fid).First(&f).Error; err != nil {
			continue
		}
		if isConcreteAuth(f.AuthType) {
			return &models.EndpointAuth{Type: f.AuthType, Data: f.AuthData}
		}
		if f.AuthType != "" && f.AuthType != string(models.AuthTypeInherit) {
			// none：明确表示不认证，停止向上继承
			return &models.EndpointAuth{Type: string(models.AuthTypeNone)}
		}
	}

	// 模块级
	var m models.Module
	if err := db.Select("auth_type", "auth_data").Where("id = ?", ep.ModuleID).First(&m).Error; err == nil {
		if isConcreteAuth(m.AuthType) {
			return &models.EndpointAuth{Type: m.AuthType, Data: m.AuthData}
		}
	}
	return nil
}

// isConcreteAuth 判断是否为具体的（会实际生效的）认证类型。
func isConcreteAuth(t string) bool {
	switch models.AuthType(t) {
	case models.AuthTypeBasic, models.AuthTypeBearer, models.AuthTypeAPIKey:
		return true
	default:
		return false
	}
}

// applyAPIKeyAuth 将 API Key 认证应用到请求（依据 In 放入 header / query / cookie）。
func applyAPIKeyAuth(req *http.Request, d models.APIKeyAuthData, vars map[string]string) {
	if d.Key == "" {
		return
	}
	val := resolveVars(d.Value, vars)
	switch d.In {
	case "query":
		q := req.URL.Query()
		q.Set(d.Key, val)
		req.URL.RawQuery = q.Encode()
	case "cookie":
		req.AddCookie(&http.Cookie{Name: d.Key, Value: val})
	default: // header
		req.Header.Set(d.Key, val)
	}
}
