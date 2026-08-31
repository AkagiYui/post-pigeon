package services

import (
	"fmt"
	"log/slog"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// ScopeSettingsService 处理模块级与文件夹级的设置：默认认证、自动参数、前置/后置操作。
type ScopeSettingsService struct {
	db *gorm.DB
}

// NewScopeSettingsService 创建作用域设置服务实例
func NewScopeSettingsService(db *gorm.DB) *ScopeSettingsService {
	return &ScopeSettingsService{db: db}
}

// ModuleSettings 模块级设置
type ModuleSettings struct {
	ServerID             string                  `json:"serverId"`
	Servers              []models.ModuleServer   `json:"servers"`
	AuthType             string                  `json:"authType"`
	AuthData             string                  `json:"authData"`
	WSProtocolConversion string                  `json:"wsProtocolConversion"`
	ProxyConfig          string                  `json:"proxyConfig"`
	TLSConfig            string                  `json:"tlsConfig"`
	URLEncoding          string                  `json:"urlEncoding"`
	TimeoutMode          string                  `json:"timeoutMode"`
	Timeout              int                     `json:"timeout"`
	FollowRedirects      *bool                   `json:"followRedirects"`
	SendNoCacheHeaders   *bool                   `json:"sendNoCacheHeaders"`
	Params               []models.ModuleParam    `json:"params"`
	Variables            []models.ModuleVariable `json:"variables"`
	Operations           []models.Operation      `json:"operations"`
}

// FolderSettings 文件夹级设置
type FolderSettings struct {
	ModuleID string `json:"moduleId"`
	ServerID string `json:"serverId"`
	AuthType string `json:"authType"`
	AuthData string `json:"authData"`
	// HasInheritedAuth 表示不考虑当前文件夹覆盖时，父文件夹/模块链上是否存在有效认证。
	HasInheritedAuth     bool                       `json:"hasInheritedAuth"`
	WSProtocolConversion string                     `json:"wsProtocolConversion"`
	ProxyConfig          string                     `json:"proxyConfig"`
	TLSConfig            string                     `json:"tlsConfig"`
	URLEncoding          string                     `json:"urlEncoding"`
	TimeoutMode          string                     `json:"timeoutMode"`
	Timeout              int                        `json:"timeout"`
	FollowRedirects      *bool                      `json:"followRedirects"`
	SendNoCacheHeaders   *bool                      `json:"sendNoCacheHeaders"`
	Operations           []models.Operation         `json:"operations"`
	InheritedOperations  []InheritedOperation       `json:"inheritedOperations"`
	OperationOverrides   []models.OperationOverride `json:"operationOverrides"`
}

// GetModuleSettings 读取模块设置
func (s *ScopeSettingsService) GetModuleSettings(moduleID string) (*ModuleSettings, error) {
	var m models.Module
	if err := s.db.Where("id = ?", moduleID).First(&m).Error; err != nil {
		return nil, fmt.Errorf("模块不存在: %w", err)
	}
	settings := &ModuleSettings{
		ServerID: m.ServerID, Servers: m.Servers,
		AuthType:             defaultAuthType(m.AuthType, "none"),
		AuthData:             m.AuthData,
		WSProtocolConversion: string(models.NormalizeWSProtocolConversion(m.WSProtocolConversion)),
		ProxyConfig:          normalizedProxySelection(m.ProxyConfig),
		TLSConfig:            normalizedTLSSelection(m.TLSConfig),
		URLEncoding:          string(models.NormalizeURLEncoding(m.URLEncoding)),
		TimeoutMode:          string(models.NormalizeTimeoutMode(m.TimeoutMode)),
		Timeout:              m.Timeout,
		FollowRedirects:      m.FollowRedirects,
		SendNoCacheHeaders:   m.SendNoCacheHeaders,
	}
	s.db.Where("module_id = ?", moduleID).Order("sort_order ASC").Find(&settings.Params)
	s.db.Where("module_id = ?", moduleID).Order("sort_order ASC").Find(&settings.Variables)
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerModule, moduleID).
		Order("stage ASC, sort_order ASC").Find(&settings.Operations)
	return settings, nil
}

// SaveModuleSettings 保存模块设置
func (s *ScopeSettingsService) SaveModuleSettings(moduleID string, settings ModuleSettings) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := validateModuleServers(settings.Servers, settings.ServerID); err != nil {
			return err
		}
		// 删除服务时一并清除各环境中其地址，不残留不可见的旧配置。
		var rows []models.ModuleBaseURL
		if err := tx.Where("module_id = ?", moduleID).Find(&rows).Error; err != nil {
			return err
		}
		configured := models.Module{Servers: settings.Servers}
		for _, row := range rows {
			changed := false
			for id := range row.ServerURLs {
				if !validModuleServer(&configured, id) {
					delete(row.ServerURLs, id)
					changed = true
				}
			}
			if changed {
				if err := tx.Model(&row).Update("server_urls", models.ToJSON(row.ServerURLs)).Error; err != nil {
					return err
				}
			}
		}

		if err := tx.Model(&models.Module{}).Where("id = ?", moduleID).Updates(map[string]any{
			"server_id": settings.ServerID, "servers": models.ToJSON(settings.Servers),
			"auth_type": defaultAuthType(settings.AuthType, "none"), "auth_data": settings.AuthData,
			"ws_protocol_conversion": persistedWSProtocolConversion(settings.WSProtocolConversion),
			"proxy_config":           persistedProxySelection(settings.ProxyConfig),
			"tls_config":             persistedTLSSelection(settings.TLSConfig),
			"url_encoding":           persistedURLEncoding(settings.URLEncoding),
			"timeout_mode":           models.PersistedTimeoutMode(settings.TimeoutMode),
			"timeout":                models.NormalizeScopedTimeoutValue(settings.TimeoutMode, settings.Timeout),
			"follow_redirects":       settings.FollowRedirects,
			"send_no_cache_headers":  settings.SendNoCacheHeaders,
		}).Error; err != nil {
			return err
		}
		// 自动参数：整体替换
		if err := tx.Where("module_id = ?", moduleID).Delete(&models.ModuleParam{}).Error; err != nil {
			return err
		}
		for i := range settings.Params {
			settings.Params[i].ID = ""
			settings.Params[i].ModuleID = moduleID
			settings.Params[i].SortOrder = i
			if err := tx.Create(&settings.Params[i]).Error; err != nil {
				return err
			}
		}
		// 模块变量：整体替换
		if err := tx.Where("module_id = ?", moduleID).Delete(&models.ModuleVariable{}).Error; err != nil {
			return err
		}
		for i := range settings.Variables {
			if settings.Variables[i].Key == "" {
				continue
			}
			settings.Variables[i].ID = ""
			settings.Variables[i].ModuleID = moduleID
			settings.Variables[i].SortOrder = i
			if err := tx.Create(&settings.Variables[i]).Error; err != nil {
				return err
			}
		}
		return saveScopeOperations(tx, models.OperationOwnerModule, moduleID, settings.Operations)
	})
}

// ApplyModuleVariableChanges 将脚本产生的模块变量增量持久化回模块：
// upserts 为新增/修改的键值（不存在则创建，存在则更新），removed 为需删除的键。
// 与 EnvironmentService.ApplyVariableChanges 同口径。
func (s *ScopeSettingsService) ApplyModuleVariableChanges(moduleID string, upserts map[string]string, removed []string) error {
	if moduleID == "" || (len(upserts) == 0 && len(removed) == 0) {
		return nil
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		for key, value := range upserts {
			var existing models.ModuleVariable
			err := tx.Where("module_id = ? AND key = ?", moduleID, key).First(&existing).Error
			switch {
			case err == gorm.ErrRecordNotFound:
				var maxOrder int
				tx.Model(&models.ModuleVariable{}).Where("module_id = ?", moduleID).
					Select("COALESCE(MAX(sort_order), -1)").Scan(&maxOrder)
				nv := models.ModuleVariable{
					ModuleID: moduleID, Key: key, Value: value,
					Enabled: true, SortOrder: maxOrder + 1,
				}
				if err := tx.Create(&nv).Error; err != nil {
					return err
				}
			case err == nil:
				if err := tx.Model(&existing).Update("value", value).Error; err != nil {
					return err
				}
			default:
				return err
			}
		}
		for _, key := range removed {
			if err := tx.Where("module_id = ? AND key = ?", moduleID, key).
				Delete(&models.ModuleVariable{}).Error; err != nil {
				return err
			}
		}
		slog.Info("脚本模块变量增量已持久化", "moduleId", moduleID, "upserts", len(upserts), "removed", len(removed))
		return nil
	})
}

// GetFolderSettings 读取文件夹设置
func (s *ScopeSettingsService) GetFolderSettings(folderID string) (*FolderSettings, error) {
	var f models.Folder
	if err := s.db.Where("id = ?", folderID).First(&f).Error; err != nil {
		return nil, fmt.Errorf("文件夹不存在: %w", err)
	}
	inheritedAuth := resolveEffectiveAuth(s.db, &models.Endpoint{
		ModuleID: f.ModuleID,
		FolderID: f.ParentID,
	}, nil)
	settings := &FolderSettings{
		ModuleID:             f.ModuleID,
		ServerID:             f.ServerID,
		AuthType:             defaultAuthType(f.AuthType, "inherit"),
		AuthData:             f.AuthData,
		HasInheritedAuth:     inheritedAuth != nil && isConcreteAuth(inheritedAuth.Type),
		WSProtocolConversion: string(models.NormalizeWSProtocolConversion(f.WSProtocolConversion)),
		ProxyConfig:          normalizedProxySelection(f.ProxyConfig),
		TLSConfig:            normalizedTLSSelection(f.TLSConfig),
		URLEncoding:          string(models.NormalizeURLEncoding(f.URLEncoding)),
		TimeoutMode:          string(models.NormalizeTimeoutMode(f.TimeoutMode)),
		Timeout:              f.Timeout,
		FollowRedirects:      f.FollowRedirects,
		SendNoCacheHeaders:   f.SendNoCacheHeaders,
	}
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerFolder, folderID).
		Order("stage ASC, sort_order ASC").Find(&settings.Operations)
	settings.InheritedOperations = inheritedOperationsForFolder(s.db, &f)
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerFolder, folderID).
		Find(&settings.OperationOverrides)
	return settings, nil
}

// SaveFolderSettings 保存文件夹设置
func (s *ScopeSettingsService) SaveFolderSettings(folderID string, settings FolderSettings) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Folder{}).Where("id = ?", folderID).Updates(map[string]any{
			"server_id": settings.ServerID,
			"auth_type": defaultAuthType(settings.AuthType, "inherit"), "auth_data": settings.AuthData,
			"ws_protocol_conversion": persistedWSProtocolConversion(settings.WSProtocolConversion),
			"proxy_config":           persistedProxySelection(settings.ProxyConfig),
			"tls_config":             persistedTLSSelection(settings.TLSConfig),
			"url_encoding":           persistedURLEncoding(settings.URLEncoding),
			"timeout_mode":           models.PersistedTimeoutMode(settings.TimeoutMode),
			"timeout":                models.NormalizeScopedTimeoutValue(settings.TimeoutMode, settings.Timeout),
			"follow_redirects":       settings.FollowRedirects,
			"send_no_cache_headers":  settings.SendNoCacheHeaders,
		}).Error; err != nil {
			return err
		}
		if err := saveScopeOperations(tx, models.OperationOwnerFolder, folderID, settings.Operations); err != nil {
			return err
		}
		var folder models.Folder
		if err := tx.Where("id = ?", folderID).First(&folder).Error; err != nil {
			return err
		}
		return saveOperationOverrides(tx, models.OperationOwnerFolder, folderID,
			settings.OperationOverrides, inheritedOperationsForFolder(tx, &folder))
	})
}

// saveScopeOperations 整体替换某归属对象的操作。
func saveScopeOperations(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string, ops []models.Operation) error {
	return syncOperations(tx, ownerType, ownerID, ops)
}

func defaultAuthType(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func persistedWSProtocolConversion(mode string) string {
	normalized := models.NormalizeWSProtocolConversion(mode)
	if normalized == models.WSProtocolConversionInherit {
		return ""
	}
	return string(normalized)
}

func normalizedProxySelection(raw string) string {
	config := parseEndpointProxy(raw)
	if config.Mode == string(models.EndpointProxyNone) || config.Mode == string(models.EndpointProxyRef) {
		return models.ToJSON(config)
	}
	return models.ToJSON(models.EndpointProxy{Mode: string(models.EndpointProxyInherit)})
}

func persistedProxySelection(raw string) string {
	config := parseEndpointProxy(raw)
	if config.Mode == string(models.EndpointProxyNone) || config.Mode == string(models.EndpointProxyRef) {
		return models.ToJSON(config)
	}
	return ""
}

func normalizedTLSSelection(raw string) string {
	config := parseEndpointTLS(raw)
	if config.Mode == string(models.EndpointTLSStrict) || config.Mode == string(models.EndpointTLSInsecure) {
		return models.ToJSON(config)
	}
	return models.ToJSON(models.EndpointTLS{Mode: string(models.EndpointTLSInherit)})
}

func persistedTLSSelection(raw string) string {
	config := parseEndpointTLS(raw)
	if config.Mode == string(models.EndpointTLSStrict) || config.Mode == string(models.EndpointTLSInsecure) {
		return models.ToJSON(config)
	}
	return ""
}

func persistedURLEncoding(mode string) string {
	normalized := models.NormalizeURLEncoding(mode)
	if normalized == models.URLEncodingInherit {
		return ""
	}
	return string(normalized)
}
