package services

import (
	"errors"
	"strings"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"
	"gorm.io/gorm"
)

const defaultServerID = "default"

func validModuleServer(module *models.Module, id string) bool {
	if id == defaultServerID {
		return true
	}
	for _, server := range module.Servers {
		if server.ID == id && id != "" {
			return true
		}
	}
	return false
}

// 无效/已删除的服务视作继承；显式选择 default 则不继续继承。
func effectiveServerID(db *gorm.DB, module *models.Module, folderID, serverID string) (string, error) {
	if validModuleServer(module, serverID) {
		return serverID, nil
	}
	seen := map[string]bool{}
	for folderID != "" && !seen[folderID] {
		seen[folderID] = true
		var folder models.Folder
		if err := db.Where("id = ? AND module_id = ?", folderID, module.ID).First(&folder).Error; err != nil {
			return "", apperr.Wrap(err, apperr.CodeFolderNotFound)
		}
		if validModuleServer(module, folder.ServerID) {
			return folder.ServerID, nil
		}
		folderID = ""
		if folder.ParentID != nil {
			folderID = *folder.ParentID
		}
	}
	if validModuleServer(module, module.ServerID) {
		return module.ServerID, nil
	}
	return defaultServerID, nil
}

func serverBaseURL(row models.ModuleBaseURL, serverID, protocol string) string {
	if serverID != defaultServerID {
		urls := row.ServerURLs[serverID]
		if protocol == "websocket" {
			return urls.WebSocket
		}
		return urls.HTTP
	}
	if protocol == "websocket" && row.WebSocketBaseURL != nil {
		return *row.WebSocketBaseURL
	}
	return row.BaseURL
}

// ResolveEnvironmentBaseURLs 用同一条继承链计算菜单中每个环境的有效地址。
// 返回所有环境，包括未配置地址的环境，顺序与项目环境列表一致。
func (s *ModuleService) ResolveEnvironmentBaseURLs(moduleID, folderID, serverID, protocol string) ([]models.ModuleBaseURL, error) {
	var module models.Module
	if err := s.db.First(&module, "id = ?", moduleID).Error; err != nil {
		return nil, apperr.Wrap(err, apperr.CodeModuleNotFound)
	}
	id, err := effectiveServerID(s.db, &module, folderID, serverID)
	if err != nil {
		return nil, err
	}
	environments, err := NewEnvironmentService(s.db).ListEnvironments(module.ProjectID)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	rows, err := s.GetModuleBaseURLs(moduleID)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDatabase)
	}
	byEnvironment := map[string]models.ModuleBaseURL{}
	for _, row := range rows {
		byEnvironment[row.EnvironmentID] = row
	}
	result := make([]models.ModuleBaseURL, 0, len(environments))
	for _, environment := range environments {
		result = append(result, models.ModuleBaseURL{ModuleID: moduleID, EnvironmentID: environment.ID, BaseURL: serverBaseURL(byEnvironment[environment.ID], id, protocol)})
	}
	return result, nil
}

func resolveEnvironmentRequestBaseURL(db *gorm.DB, data *SendRequestData, protocol string) error {
	if !data.UseEnvironmentBaseURL {
		return nil
	}
	if db == nil || data.ModuleID == "" {
		return apperr.New(apperr.CodeModuleNotFound)
	}
	var module models.Module
	if err := db.First(&module, "id = ?", data.ModuleID).Error; err != nil {
		return apperr.Wrap(err, apperr.CodeModuleNotFound)
	}
	id, err := effectiveServerID(db, &module, data.FolderID, data.ServerID)
	if err != nil {
		return err
	}
	data.BaseURL = ""
	if data.EnvironmentID == "" {
		return nil
	}
	var environment models.Environment
	if err := db.Where("id = ? AND project_id = ?", data.EnvironmentID, module.ProjectID).First(&environment).Error; err != nil {
		return apperr.New(apperr.CodeEnvironmentNotFound)
	}
	var row models.ModuleBaseURL
	if err := db.Where("module_id = ? AND environment_id = ?", module.ID, environment.ID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return apperr.Wrap(err, apperr.CodeDatabase)
	}
	data.BaseURL = serverBaseURL(row, id, protocol)
	return nil
}

// SaveEnvironmentBaseURLs 原子保存一个环境的模块/服务/协议地址，防止半次保存。
func (s *ModuleService) SaveEnvironmentBaseURLs(environmentID string, rows []models.ModuleBaseURL) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var environment models.Environment
		if err := tx.First(&environment, "id = ?", environmentID).Error; err != nil {
			return apperr.Wrap(err, apperr.CodeEnvironmentNotFound)
		}
		for _, row := range rows {
			var module models.Module
			if err := tx.Where("id = ? AND project_id = ?", row.ModuleID, environment.ProjectID).First(&module).Error; err != nil {
				return apperr.Wrap(err, apperr.CodeModuleNotFound)
			}
			for id := range row.ServerURLs {
				if id == defaultServerID || !validModuleServer(&module, id) {
					return apperr.New(apperr.CodeInvalidInput)
				}
			}
			var stored models.ModuleBaseURL
			err := tx.Where("module_id = ? AND environment_id = ?", row.ModuleID, environmentID).First(&stored).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return apperr.Wrap(err, apperr.CodeDatabase)
			}
			stored.ModuleID, stored.EnvironmentID = row.ModuleID, environmentID
			stored.BaseURL, stored.WebSocketBaseURL, stored.ServerURLs = row.BaseURL, row.WebSocketBaseURL, row.ServerURLs
			if err := tx.Save(&stored).Error; err != nil {
				return apperr.Wrap(err, apperr.CodeDatabase)
			}
		}
		return nil
	})
}

func validateModuleServers(servers []models.ModuleServer, selected string) error {
	seen := map[string]bool{defaultServerID: true}
	for _, server := range servers {
		if server.ID == "" || seen[server.ID] || strings.TrimSpace(server.Name) == "" {
			return apperr.New(apperr.CodeInvalidInput)
		}
		seen[server.ID] = true
	}
	if selected != "" && !seen[selected] {
		return apperr.New(apperr.CodeInvalidInput)
	}
	return nil
}
