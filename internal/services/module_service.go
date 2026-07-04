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

// CreateModule 在项目中创建新模块，并自动创建根文件夹
func (s *ModuleService) CreateModule(projectID string, name string) (*models.Module, error) {
	// 获取当前最大排序号
	var maxSort int
	s.db.Model(&models.Module{}).Where("project_id = ?", projectID).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	module := &models.Module{
		ProjectID: projectID,
		Name:      name,
		SortOrder: maxSort + 1,
	}

	// 使用事务确保模块和根文件夹的创建是原子操作
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(module).Error; err != nil {
			return err
		}

		// 创建根文件夹
		folder := &models.Folder{
			ModuleID:  module.ID,
			ParentID:  nil,
			Name:      "__root",
			SortOrder: 0,
		}
		if err := tx.Create(folder).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
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

// SetEndpointDisplay 设置模块下接口的显示方式（name 名称 / url 路径）。
func (s *ModuleService) SetEndpointDisplay(id string, display string) error {
	if display != "url" {
		display = "name"
	}
	if err := s.db.Model(&models.Module{}).Where("id = ?", id).Update("endpoint_display", display).Error; err != nil {
		return fmt.Errorf("更新接口显示方式失败: %w", err)
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

// DuplicateModule 复制模块及其所有文件夹、端点和前置 URL 到同一项目
func (s *ModuleService) DuplicateModule(id string) (*models.Module, error) {
	var src models.Module
	if err := s.db.Where("id = ?", id).First(&src).Error; err != nil {
		return nil, fmt.Errorf("获取模块失败: %w", err)
	}

	var maxSort int
	s.db.Model(&models.Module{}).Where("project_id = ?", src.ProjectID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	newModule := &models.Module{
		ProjectID: src.ProjectID,
		Name:      src.Name + " 副本",
		SortOrder: maxSort + 1,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newModule).Error; err != nil {
			return err
		}

		// 复制前置 URL
		var baseURLs []models.ModuleBaseURL
		if err := tx.Where("module_id = ?", src.ID).Find(&baseURLs).Error; err != nil {
			return err
		}
		for _, bu := range baseURLs {
			bu.ID = ""
			bu.ModuleID = newModule.ID
			if err := tx.Create(&bu).Error; err != nil {
				return err
			}
		}

		// 复制文件夹树：先复制根文件夹（parent_id 为空），保持层级结构
		var rootFolders []models.Folder
		if err := tx.Where("module_id = ? AND parent_id IS NULL", src.ID).
			Order("sort_order ASC").Find(&rootFolders).Error; err != nil {
			return err
		}
		fs := &FolderService{db: s.db}
		// oldFolderID -> newFolderID 映射，用于复制文件夹下端点
		for _, rf := range rootFolders {
			if _, err := fs.copyFolderTree(tx, rf, nil, newModule.ID, "", -1); err != nil {
				return err
			}
		}

		// 复制模块直属端点（folder_id 为空）
		var directEndpoints []models.Endpoint
		if err := tx.Where("module_id = ? AND folder_id IS NULL", src.ID).
			Order("sort_order ASC").Find(&directEndpoints).Error; err != nil {
			return err
		}
		for _, ep := range directEndpoints {
			if err := copyEndpointRecord(tx, ep, newModule.ID, nil, ""); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		slog.Error("复制模块失败", "error", err)
		return nil, fmt.Errorf("复制模块失败: %w", err)
	}
	slog.Info("模块已复制", "srcID", id, "newID", newModule.ID)
	return newModule, nil
}

// UpdateModuleSortOrder 更新模块排序
func (s *ModuleService) UpdateModuleSortOrder(id string, sortOrder int) error {
	return s.db.Model(&models.Module{}).Where("id = ?", id).Update("sort_order", sortOrder).Error
}

// ConvertFolderToModule 将文件夹转换为新模块。
// 新模块的前置 URL 复制自该文件夹原所属模块；该文件夹本身成为新模块的根文件夹，
// 其子文件夹与接口（连同后代）一并归入新模块。
func (s *ModuleService) ConvertFolderToModule(folderID string, newModuleName string) (*models.Module, error) {
	var folder models.Folder
	if err := s.db.Where("id = ?", folderID).First(&folder).Error; err != nil {
		return nil, fmt.Errorf("获取文件夹失败: %w", err)
	}
	// 根文件夹（parent_id 为空）本身即模块根，无需转换
	if folder.ParentID == nil {
		return nil, fmt.Errorf("根文件夹无法转换为模块")
	}

	var srcModule models.Module
	if err := s.db.Where("id = ?", folder.ModuleID).First(&srcModule).Error; err != nil {
		return nil, fmt.Errorf("获取所属模块失败: %w", err)
	}

	var maxSort int
	s.db.Model(&models.Module{}).Where("project_id = ?", srcModule.ProjectID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	newModule := &models.Module{
		ProjectID: srcModule.ProjectID,
		Name:      newModuleName,
		SortOrder: maxSort + 1,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newModule).Error; err != nil {
			return err
		}

		// 复制原模块各环境的前置 URL 到新模块
		var baseURLs []models.ModuleBaseURL
		if err := tx.Where("module_id = ?", srcModule.ID).Find(&baseURLs).Error; err != nil {
			return err
		}
		for _, bu := range baseURLs {
			bu.ID = ""
			bu.ModuleID = newModule.ID
			if err := tx.Create(&bu).Error; err != nil {
				return err
			}
		}

		// 收集该文件夹及其所有后代文件夹 ID（含自身）
		descendantIDs := (&FolderService{}).collectFolderIDs(tx, folderID)

		// 该文件夹升级为新模块的根文件夹
		if err := tx.Model(&models.Folder{}).Where("id = ?", folderID).Updates(map[string]interface{}{
			"module_id": newModule.ID,
			"parent_id": nil,
			"name":      "__root",
		}).Error; err != nil {
			return err
		}

		// 后代文件夹与其下接口归入新模块（父子关系不变，仅归属模块变化）
		if len(descendantIDs) > 0 {
			if err := tx.Model(&models.Folder{}).Where("id IN ?", descendantIDs).
				Update("module_id", newModule.ID).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.Endpoint{}).Where("folder_id IN ?", descendantIDs).
				Update("module_id", newModule.ID).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		slog.Error("转换文件夹为模块失败", "error", err)
		return nil, fmt.Errorf("转换文件夹为模块失败: %w", err)
	}
	slog.Info("文件夹已转换为模块", "folderID", folderID, "newModuleID", newModule.ID, "name", newModule.Name)
	return newModule, nil
}

// GetModuleParams 获取模块的自动参数（供接口详情页展示"全局参数"分区）。
// 返回全部参数（含未启用），前端据 type/enabled 自行筛选展示。
func (s *ModuleService) GetModuleParams(moduleID string) ([]models.ModuleParam, error) {
	var params []models.ModuleParam
	err := s.db.Where("module_id = ?", moduleID).Order("sort_order ASC").Find(&params).Error
	if err != nil {
		return nil, fmt.Errorf("获取模块自动参数失败: %w", err)
	}
	return params, nil
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
