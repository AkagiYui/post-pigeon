package services

import (
	"fmt"

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
	AuthType   string               `json:"authType"`
	AuthData   string               `json:"authData"`
	Params     []models.ModuleParam `json:"params"`
	Operations []models.Operation   `json:"operations"`
}

// FolderSettings 文件夹级设置
type FolderSettings struct {
	AuthType   string             `json:"authType"`
	AuthData   string             `json:"authData"`
	Operations []models.Operation `json:"operations"`
}

// GetModuleSettings 读取模块设置
func (s *ScopeSettingsService) GetModuleSettings(moduleID string) (*ModuleSettings, error) {
	var m models.Module
	if err := s.db.Where("id = ?", moduleID).First(&m).Error; err != nil {
		return nil, fmt.Errorf("模块不存在: %w", err)
	}
	settings := &ModuleSettings{AuthType: defaultAuthType(m.AuthType, "none"), AuthData: m.AuthData}
	s.db.Where("module_id = ?", moduleID).Order("sort_order ASC").Find(&settings.Params)
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerModule, moduleID).
		Order("stage ASC, sort_order ASC").Find(&settings.Operations)
	return settings, nil
}

// SaveModuleSettings 保存模块设置
func (s *ScopeSettingsService) SaveModuleSettings(moduleID string, settings ModuleSettings) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Module{}).Where("id = ?", moduleID).Updates(map[string]interface{}{
			"auth_type": defaultAuthType(settings.AuthType, "none"), "auth_data": settings.AuthData,
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
		return saveScopeOperations(tx, models.OperationOwnerModule, moduleID, settings.Operations)
	})
}

// GetFolderSettings 读取文件夹设置
func (s *ScopeSettingsService) GetFolderSettings(folderID string) (*FolderSettings, error) {
	var f models.Folder
	if err := s.db.Where("id = ?", folderID).First(&f).Error; err != nil {
		return nil, fmt.Errorf("文件夹不存在: %w", err)
	}
	settings := &FolderSettings{AuthType: defaultAuthType(f.AuthType, "inherit"), AuthData: f.AuthData}
	s.db.Where("owner_type = ? AND owner_id = ?", models.OperationOwnerFolder, folderID).
		Order("stage ASC, sort_order ASC").Find(&settings.Operations)
	return settings, nil
}

// SaveFolderSettings 保存文件夹设置
func (s *ScopeSettingsService) SaveFolderSettings(folderID string, settings FolderSettings) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Folder{}).Where("id = ?", folderID).Updates(map[string]interface{}{
			"auth_type": defaultAuthType(settings.AuthType, "inherit"), "auth_data": settings.AuthData,
		}).Error; err != nil {
			return err
		}
		return saveScopeOperations(tx, models.OperationOwnerFolder, folderID, settings.Operations)
	})
}

// saveScopeOperations 整体替换某归属对象的操作。
func saveScopeOperations(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string, ops []models.Operation) error {
	if err := tx.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID).Delete(&models.Operation{}).Error; err != nil {
		return err
	}
	// 按阶段各自编号
	stageOrder := map[string]int{}
	for i := range ops {
		ops[i].ID = ""
		ops[i].OwnerType = string(ownerType)
		ops[i].OwnerID = ownerID
		ops[i].SortOrder = stageOrder[ops[i].Stage]
		stageOrder[ops[i].Stage]++
		if err := tx.Create(&ops[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func defaultAuthType(v, def string) string {
	if v == "" {
		return def
	}
	return v
}
