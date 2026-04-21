package services

import (
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// ModuleService 模块管理服务
type ModuleService struct {
	db *gorm.DB
}

// NewModuleService 创建模块服务实例
func NewModuleService(db *gorm.DB) *ModuleService {
	return &ModuleService{db: db}
}

// ListModules 获取项目下所有模块
func (s *ModuleService) ListModules(projectID string) ([]models.Module, error) {
	var modules []models.Module
	err := s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&modules).Error
	if err != nil {
		return nil, fmt.Errorf("获取模块列表失败: %w", err)
	}
	return modules, nil
}

// GetModule 根据 ID 获取模块
func (s *ModuleService) GetModule(id string) (*models.Module, error) {
	var module models.Module
	err := s.db.Where("id = ?", id).First(&module).Error
	if err != nil {
		return nil, fmt.Errorf("获取模块失败: %w", err)
	}
	return &module, nil
}

// CreateModule 在项目中创建新模块
func (s *ModuleService) CreateModule(projectID string, name string) (*models.Module, error) {
	// 获取当前最大排序号
	var maxSort int
	s.db.Model(&models.Module{}).Where("project_id = ?", projectID).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	module := &models.Module{
		ProjectID: projectID,
		Name:      name,
		SortOrder: maxSort + 1,
	}
	if err := s.db.Create(module).Error; err != nil {
		slog.Error("创建模块失败", "error", err)
		return nil, fmt.Errorf("创建模块失败: %w", err)
	}
	slog.Info("模块已创建", "id", module.ID, "name", module.Name)
	return module, nil
}

// UpdateModule 更新模块信息
func (s *ModuleService) UpdateModule(id string, name string) error {
	result := s.db.Model(&models.Module{}).Where("id = ?", id).Update("name", name)
	if result.Error != nil {
		return fmt.Errorf("更新模块失败: %w", result.Error)
	}
	return nil
}

// DeleteModule 删除模块及其所有关联数据
func (s *ModuleService) DeleteModule(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 获取所有端点 ID
		var endpointIDs []string
		if err := tx.Model(&models.Endpoint{}).Where("module_id = ?", id).Pluck("id", &endpointIDs).Error; err != nil {
			return err
		}

		if len(endpointIDs) > 0 {
			// 删除端点关联数据
			if err := tx.Where("endpoint_id IN ?", endpointIDs).Delete(&models.EndpointParam{}).Error; err != nil {
				return err
			}
			if err := tx.Where("endpoint_id IN ?", endpointIDs).Delete(&models.EndpointBodyField{}).Error; err != nil {
				return err
			}
			if err := tx.Where("endpoint_id IN ?", endpointIDs).Delete(&models.EndpointHeader{}).Error; err != nil {
				return err
			}
			if err := tx.Where("endpoint_id IN ?", endpointIDs).Delete(&models.EndpointAuth{}).Error; err != nil {
				return err
			}
			if err := tx.Where("endpoint_id IN ?", endpointIDs).Delete(&models.Response{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", endpointIDs).Delete(&models.Endpoint{}).Error; err != nil {
				return err
			}
		}

		// 删除文件夹
		if err := tx.Where("module_id = ?", id).Delete(&models.Folder{}).Error; err != nil {
			return err
		}
		// 删除前置 URL
		if err := tx.Where("module_id = ?", id).Delete(&models.ModuleBaseURL{}).Error; err != nil {
			return err
		}
		// 删除请求历史
		if err := tx.Where("module_id = ?", id).Delete(&models.RequestHistory{}).Error; err != nil {
			return err
		}
		// 删除模块
		if err := tx.Where("id = ?", id).Delete(&models.Module{}).Error; err != nil {
			return err
		}

		slog.Info("模块已删除", "id", id)
		return nil
	})
}

// UpdateModuleSortOrder 更新模块排序
func (s *ModuleService) UpdateModuleSortOrder(id string, sortOrder int) error {
	return s.db.Model(&models.Module{}).Where("id = ?", id).Update("sort_order", sortOrder).Error
}

// GetModuleBaseURLs 获取模块的所有前置 URL
func (s *ModuleService) GetModuleBaseURLs(moduleID string) ([]models.ModuleBaseURL, error) {
	var urls []models.ModuleBaseURL
	err := s.db.Where("module_id = ?", moduleID).Find(&urls).Error
	if err != nil {
		return nil, fmt.Errorf("获取模块前置URL失败: %w", err)
	}
	return urls, nil
}

// SetModuleBaseURL 设置模块在指定环境下的前置 URL
func (s *ModuleService) SetModuleBaseURL(moduleID string, environmentID string, baseURL string) error {
	var existing models.ModuleBaseURL
	result := s.db.Where("module_id = ? AND environment_id = ?", moduleID, environmentID).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		// 创建新记录
		url := &models.ModuleBaseURL{
			ModuleID:      moduleID,
			EnvironmentID: environmentID,
			BaseURL:       baseURL,
		}
		return s.db.Create(url).Error
	}

	if result.Error != nil {
		return result.Error
	}

	// 更新现有记录
	return s.db.Model(&existing).Update("base_url", baseURL).Error
}
