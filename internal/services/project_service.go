// Package services 提供业务逻辑层，处理数据 CRUD 和业务规则
package services

import (
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"
	"time"

	"gorm.io/gorm"
)

// ProjectService 项目管理服务
type ProjectService struct {
	db *gorm.DB
}

// NewProjectService 创建项目服务实例
func NewProjectService(db *gorm.DB) *ProjectService {
	return &ProjectService{db: db}
}

// ListProjects 获取所有项目列表
func (s *ProjectService) ListProjects() ([]models.Project, error) {
	var projects []models.Project
	err := s.db.Order("sort_order ASC, updated_at DESC").Find(&projects).Error
	if err != nil {
		slog.Error("获取项目列表失败", "error", err)
		return nil, fmt.Errorf("获取项目列表失败: %w", err)
	}
	return projects, nil
}

// ReorderProjects 更新项目排序顺序
// 接收一个项目 ID 列表，按列表顺序设置每个项目的 sort_order
func (s *ProjectService) ReorderProjects(ids []string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range ids {
			result := tx.Model(&models.Project{}).Where("id = ?", id).Update("sort_order", i+1)
			if result.Error != nil {
				slog.Error("更新项目排序失败", "error", result.Error, "id", id)
				return fmt.Errorf("更新项目排序失败: %w", result.Error)
			}
			if result.RowsAffected == 0 {
				slog.Warn("排序项目不存在", "id", id)
			}
		}
		slog.Info("项目排序已更新")
		return nil
	})
}

// GetProject 根据 ID 获取项目详情
func (s *ProjectService) GetProject(id string) (*models.Project, error) {
	slog.Debug("GetProject 被调用", "id", id)
	var project models.Project
	err := s.db.Where("id = ?", id).First(&project).Error
	if err != nil {
		// 项目不存在时不返回错误，而是返回 nil
		if err == gorm.ErrRecordNotFound {
			slog.Warn("项目不存在", "id", id)
			return nil, nil
		}
		return nil, fmt.Errorf("获取项目失败: %w", err)
	}
	slog.Debug("项目查询成功", "id", id, "name", project.Name)
	return &project, nil
}

// CreateProject 创建新项目，并自动创建默认模块、根文件夹和默认环境
func (s *ProjectService) CreateProject(name string, description string) (*models.Project, error) {
	project := &models.Project{
		Name:        name,
		Description: description,
	}

	// 使用事务确保项目、默认模块、根文件夹和默认环境的创建是原子操作
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 创建项目
		if err := tx.Create(project).Error; err != nil {
			return err
		}

		// 创建默认模块
		module := &models.Module{
			ProjectID: project.ID,
			Name:      "默认模块",
			SortOrder: 0,
		}
		if err := tx.Create(module).Error; err != nil {
			return err
		}

		// 创建根文件夹
		folder := &models.Folder{
			ModuleID:  module.ID,
			ParentID:  nil,
			Name:      "根目录",
			SortOrder: 0,
		}
		if err := tx.Create(folder).Error; err != nil {
			return err
		}

		// 创建默认环境：「测试环境」和「正式环境」
		envNames := []string{"测试环境", "正式环境"}
		for _, envName := range envNames {
			env := &models.Environment{
				ProjectID: project.ID,
				Name:      envName,
			}
			if err := tx.Create(env).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		slog.Error("创建项目失败", "error", err)
		return nil, fmt.Errorf("创建项目失败: %w", err)
	}

	slog.Info("项目已创建", "id", project.ID, "name", project.Name)
	return project, nil
}

// UpdateProject 更新项目信息
func (s *ProjectService) UpdateProject(id string, name string, description string) error {
	result := s.db.Model(&models.Project{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name":        name,
		"description": description,
	})
	if result.Error != nil {
		slog.Error("更新项目失败", "error", result.Error)
		return fmt.Errorf("更新项目失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("项目不存在: %s", id)
	}
	slog.Info("项目已更新", "id", id)
	return nil
}

// DeleteProject 删除项目及其所有关联数据
func (s *ProjectService) DeleteProject(id string) error {
	// 使用事务确保数据一致性
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 删除项目下的所有关联数据
		// 1. 获取所有模块 ID
		var moduleIDs []string
		if err := tx.Model(&models.Module{}).Where("project_id = ?", id).Pluck("id", &moduleIDs).Error; err != nil {
			return err
		}

		if len(moduleIDs) > 0 {
			// 2. 获取所有端点 ID
			var endpointIDs []string
			if err := tx.Model(&models.Endpoint{}).Where("module_id IN ?", moduleIDs).Pluck("id", &endpointIDs).Error; err != nil {
				return err
			}

			if len(endpointIDs) > 0 {
				// 3. 删除端点关联数据
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
				// 删除端点
				if err := tx.Where("id IN ?", endpointIDs).Delete(&models.Endpoint{}).Error; err != nil {
					return err
				}
			}

			// 4. 删除文件夹
			if err := tx.Where("module_id IN ?", moduleIDs).Delete(&models.Folder{}).Error; err != nil {
				return err
			}
			// 5. 删除模块前置 URL
			if err := tx.Where("module_id IN ?", moduleIDs).Delete(&models.ModuleBaseURL{}).Error; err != nil {
				return err
			}
			// 6. 删除请求历史
			if err := tx.Where("module_id IN ?", moduleIDs).Delete(&models.RequestHistory{}).Error; err != nil {
				return err
			}
			// 7. 删除模块
			if err := tx.Where("id IN ?", moduleIDs).Delete(&models.Module{}).Error; err != nil {
				return err
			}
		}

		// 删除环境变量和环境
		var envIDs []string
		if err := tx.Model(&models.Environment{}).Where("project_id = ?", id).Pluck("id", &envIDs).Error; err != nil {
			return err
		}
		if len(envIDs) > 0 {
			if err := tx.Where("environment_id IN ?", envIDs).Delete(&models.EnvironmentVariable{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", envIDs).Delete(&models.Environment{}).Error; err != nil {
				return err
			}
		}

		// 最后删除项目
		if err := tx.Where("id = ?", id).Delete(&models.Project{}).Error; err != nil {
			return err
		}

		slog.Info("项目已删除", "id", id)
		return nil
	})
}

// GetProjectTree 获取项目的完整树形结构（模块 + 文件夹 + 端点）
func (s *ProjectService) GetProjectTree(id string) ([]ModuleTree, error) {
	var modules []models.Module
	if err := s.db.Where("project_id = ?", id).Order("sort_order ASC").Find(&modules).Error; err != nil {
		return nil, err
	}

	var result []ModuleTree
	for _, module := range modules {
		tree := ModuleTree{
			ID:        module.ID,
			ProjectID: module.ProjectID,
			Name:      module.Name,
			SortOrder: module.SortOrder,
			CreatedAt: module.CreatedAt,
			UpdatedAt: module.UpdatedAt,
			Folders:   []FolderTree{},
			Endpoints: []models.Endpoint{},
		}

		// 获取模块下直属的端点（不在任何文件夹中的）
		if err := s.db.Where("module_id = ? AND folder_id IS NULL", module.ID).
			Order("sort_order ASC").Find(&tree.Endpoints).Error; err != nil {
			return nil, err
		}

		// 获取模块下的顶级文件夹（先查 models.Folder 再转 FolderTree，避免 GORM 解析 FolderTree 的递归字段报错）
		var topFolders []models.Folder
		if err := s.db.Where("module_id = ? AND parent_id IS NULL", module.ID).
			Order("sort_order ASC").Find(&topFolders).Error; err != nil {
			return nil, err
		}
		tree.Folders = make([]FolderTree, len(topFolders))
		for i, f := range topFolders {
			tree.Folders[i] = FolderTree{
				ID:        f.ID,
				ModuleID:  f.ModuleID,
				ParentID:  f.ParentID,
				Name:      f.Name,
				SortOrder: f.SortOrder,
				CreatedAt: f.CreatedAt,
				UpdatedAt: f.UpdatedAt,
				Children:  []FolderTree{},
				Endpoints: []models.Endpoint{},
			}
		}

		// 递归构建文件夹树
		for i := range tree.Folders {
			if err := s.buildFolderTree(&tree.Folders[i]); err != nil {
				return nil, err
			}
		}

		result = append(result, tree)
	}

	return result, nil
}

// buildFolderTree 递归构建文件夹树
func (s *ProjectService) buildFolderTree(folder *FolderTree) error {
	// 获取子文件夹（先查 models.Folder 再转 FolderTree，避免 GORM 解析 FolderTree 的递归字段报错）
	var childFolders []models.Folder
	if err := s.db.Where("parent_id = ?", folder.ID).
		Order("sort_order ASC").Find(&childFolders).Error; err != nil {
		return err
	}

	// 转换为 FolderTree
	folder.Children = make([]FolderTree, len(childFolders))
	for i, f := range childFolders {
		folder.Children[i] = FolderTree{
			ID:        f.ID,
			ModuleID:  f.ModuleID,
			ParentID:  f.ParentID,
			Name:      f.Name,
			SortOrder: f.SortOrder,
			CreatedAt: f.CreatedAt,
			UpdatedAt: f.UpdatedAt,
			Children:  []FolderTree{},
			Endpoints: []models.Endpoint{},
		}
	}

	// 获取文件夹下的端点
	if err := s.db.Model(&models.Endpoint{}).Where("folder_id = ?", folder.ID).
		Order("sort_order ASC").Find(&folder.Endpoints).Error; err != nil {
		return err
	}

	// 递归处理子文件夹
	for i := range folder.Children {
		if err := s.buildFolderTree(&folder.Children[i]); err != nil {
			return err
		}
	}

	return nil
}

// ModuleTree 模块树形结构（不含 GORM 标签，避免与 models.Module 的 GORM 注解冲突）
type ModuleTree struct {
	ID        string            `json:"id"`
	ProjectID string            `json:"projectId"`
	Name      string            `json:"name"`
	SortOrder int               `json:"sortOrder"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
	Folders   []FolderTree      `json:"folders"`
	Endpoints []models.Endpoint `json:"endpoints"`
}

// FolderTree 文件夹树形结构（不含 GORM 标签，避免与 models.Folder 的 GORM 注解冲突）
type FolderTree struct {
	ID        string            `json:"id"`
	ModuleID  string            `json:"moduleId"`
	ParentID  *string           `json:"parentId"`
	Name      string            `json:"name"`
	SortOrder int               `json:"sortOrder"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
	Children  []FolderTree      `json:"children"`
	Endpoints []models.Endpoint `json:"endpoints"`
}
