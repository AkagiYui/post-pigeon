package services

import (
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// FolderService 文件夹管理服务
type FolderService struct {
	db *gorm.DB
}

// NewFolderService 创建文件夹服务实例
func NewFolderService(db *gorm.DB) *FolderService {
	return &FolderService{db: db}
}

// CreateFolder 创建新文件夹
func (s *FolderService) CreateFolder(moduleID string, parentID *string, name string) (*models.Folder, error) {
	// 如果没有指定父文件夹，则自动使用模块的根文件夹作为父文件夹
	// 根文件夹是该模块下 parent_id 为空的文件夹，新文件夹作为其子节点才能被树正确展示
	if parentID == nil {
		var rootFolder models.Folder
		if err := s.db.Where("module_id = ? AND parent_id IS NULL", moduleID).First(&rootFolder).Error; err != nil {
			slog.Error("查找根文件夹失败", "error", err, "moduleID", moduleID)
			return nil, fmt.Errorf("查找根文件夹失败: %w", err)
		}
		parentID = &rootFolder.ID
	}

	// 获取当前最大排序号
	var maxSort int
	s.db.Model(&models.Folder{}).Where("module_id = ? AND parent_id = ?", moduleID, *parentID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

	folder := &models.Folder{
		ModuleID:  moduleID,
		ParentID:  parentID,
		Name:      name,
		SortOrder: maxSort + 1,
	}
	if err := s.db.Create(folder).Error; err != nil {
		slog.Error("创建文件夹失败", "error", err)
		return nil, fmt.Errorf("创建文件夹失败: %w", err)
	}
	slog.Info("文件夹已创建", "id", folder.ID, "name", folder.Name, "parentID", *parentID)
	return folder, nil
}

// UpdateFolder 更新文件夹信息
func (s *FolderService) UpdateFolder(id string, name string) error {
	result := s.db.Model(&models.Folder{}).Where("id = ?", id).Update("name", name)
	if result.Error != nil {
		return fmt.Errorf("更新文件夹失败: %w", result.Error)
	}
	return nil
}

// DeleteFolder 删除文件夹及其所有子内容
func (s *FolderService) DeleteFolder(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 递归收集所有子文件夹 ID
		folderIDs := s.collectFolderIDs(tx, id)

		// 获取所有端点 ID
		var endpointIDs []string
		if err := tx.Model(&models.Endpoint{}).Where("folder_id IN ?", folderIDs).Pluck("id", &endpointIDs).Error; err != nil {
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

		// 删除所有子文件夹和自身
		if err := tx.Where("id IN ?", folderIDs).Delete(&models.Folder{}).Error; err != nil {
			return err
		}

		slog.Info("文件夹已删除", "id", id)
		return nil
	})
}

// collectFolderIDs 递归收集文件夹及其所有子文件夹的 ID
func (s *FolderService) collectFolderIDs(tx *gorm.DB, folderID string) []string {
	ids := []string{folderID}

	var childIDs []string
	tx.Model(&models.Folder{}).Where("parent_id = ?", folderID).Pluck("id", &childIDs)

	for _, childID := range childIDs {
		ids = append(ids, s.collectFolderIDs(tx, childID)...)
	}

	return ids
}

// MoveFolder 移动文件夹到新的父文件夹
func (s *FolderService) MoveFolder(id string, parentID *string) error {
	return s.db.Model(&models.Folder{}).Where("id = ?", id).Update("parent_id", parentID).Error
}

// MoveFolderTo 移动文件夹到目标模块下的目标父文件夹
// targetParentID 为 nil 表示移动到模块根级（自动挂到模块根文件夹下）
// 会递归更新该文件夹及其所有后代文件夹、端点的 module_id
func (s *FolderService) MoveFolderTo(id string, targetModuleID string, targetParentID *string) error {
	// 收集自身及所有后代文件夹 ID，用于防止移动到自身或后代、以及批量更新 module_id
	descendantIDs := s.collectFolderIDs(s.db, id)

	// 校验：不能移动到自身或其后代之下
	if targetParentID != nil {
		for _, d := range descendantIDs {
			if d == *targetParentID {
				return fmt.Errorf("不能将文件夹移动到其自身或子文件夹下")
			}
		}
	}

	// 目标父文件夹为 nil 时，解析为目标模块的根文件夹
	resolvedParentID := targetParentID
	if resolvedParentID == nil {
		var rootFolder models.Folder
		if err := s.db.Where("module_id = ? AND parent_id IS NULL", targetModuleID).First(&rootFolder).Error; err != nil {
			return fmt.Errorf("查找目标模块根文件夹失败: %w", err)
		}
		resolvedParentID = &rootFolder.ID
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// 更新被移动文件夹的父文件夹和所属模块
		if err := tx.Model(&models.Folder{}).Where("id = ?", id).Updates(map[string]interface{}{
			"parent_id": resolvedParentID,
			"module_id": targetModuleID,
		}).Error; err != nil {
			return err
		}

		// 递归更新所有后代文件夹与端点的 module_id（父子关系不变，仅归属模块变化）
		if len(descendantIDs) > 0 {
			if err := tx.Model(&models.Folder{}).Where("id IN ?", descendantIDs).
				Update("module_id", targetModuleID).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.Endpoint{}).Where("folder_id IN ?", descendantIDs).
				Update("module_id", targetModuleID).Error; err != nil {
				return err
			}
		}

		slog.Info("文件夹已移动", "id", id, "targetModuleID", targetModuleID)
		return nil
	})
}

// DuplicateFolder 复制文件夹及其所有子内容到同一父文件夹下
func (s *FolderService) DuplicateFolder(id string) (*models.Folder, error) {
	var src models.Folder
	if err := s.db.Where("id = ?", id).First(&src).Error; err != nil {
		return nil, fmt.Errorf("获取文件夹失败: %w", err)
	}

	// 计算同级最大排序号
	var maxSort int
	if src.ParentID != nil {
		s.db.Model(&models.Folder{}).Where("module_id = ? AND parent_id = ?", src.ModuleID, *src.ParentID).
			Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)
	} else {
		s.db.Model(&models.Folder{}).Where("module_id = ? AND parent_id IS NULL", src.ModuleID).
			Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)
	}

	var newFolder *models.Folder
	err := s.db.Transaction(func(tx *gorm.DB) error {
		f, err := s.copyFolderTree(tx, src, src.ParentID, src.ModuleID, src.Name+" 副本", maxSort+1)
		if err != nil {
			return err
		}
		newFolder = f
		return nil
	})
	if err != nil {
		slog.Error("复制文件夹失败", "error", err)
		return nil, fmt.Errorf("复制文件夹失败: %w", err)
	}
	slog.Info("文件夹已复制", "srcID", id, "newID", newFolder.ID)
	return newFolder, nil
}

// copyFolderTree 递归复制文件夹树（含其下端点），返回新建的文件夹
// nameOverride 为空时沿用源文件夹名称；sortOrder < 0 时沿用源排序号
func (s *FolderService) copyFolderTree(tx *gorm.DB, src models.Folder, parentID *string, moduleID string, nameOverride string, sortOrder int) (*models.Folder, error) {
	name := src.Name
	if nameOverride != "" {
		name = nameOverride
	}
	sort := src.SortOrder
	if sortOrder >= 0 {
		sort = sortOrder
	}

	newFolder := &models.Folder{
		ModuleID:  moduleID,
		ParentID:  parentID,
		Name:      name,
		SortOrder: sort,
	}
	if err := tx.Create(newFolder).Error; err != nil {
		return nil, err
	}

	// 复制该文件夹下的端点
	var endpoints []models.Endpoint
	if err := tx.Where("folder_id = ?", src.ID).Order("sort_order ASC").Find(&endpoints).Error; err != nil {
		return nil, err
	}
	for _, ep := range endpoints {
		if err := copyEndpointRecord(tx, ep, moduleID, &newFolder.ID, ""); err != nil {
			return nil, err
		}
	}

	// 递归复制子文件夹
	var children []models.Folder
	if err := tx.Where("parent_id = ?", src.ID).Order("sort_order ASC").Find(&children).Error; err != nil {
		return nil, err
	}
	for _, child := range children {
		if _, err := s.copyFolderTree(tx, child, &newFolder.ID, moduleID, "", -1); err != nil {
			return nil, err
		}
	}

	return newFolder, nil
}
