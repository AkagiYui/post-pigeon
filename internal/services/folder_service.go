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
	// 获取当前最大排序号
	var maxSort int
	query := s.db.Model(&models.Folder{}).Where("module_id = ?", moduleID)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	query.Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)

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
	slog.Info("文件夹已创建", "id", folder.ID, "name", folder.Name)
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
