package services

import (
	"fmt"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// ScriptLibraryService 项目级脚本库服务
type ScriptLibraryService struct {
	db *gorm.DB
}

// NewScriptLibraryService 创建脚本库服务实例
func NewScriptLibraryService(db *gorm.DB) *ScriptLibraryService {
	return &ScriptLibraryService{db: db}
}

// ListScripts 列出项目的脚本库
func (s *ScriptLibraryService) ListScripts(projectID string) ([]models.ScriptLibrary, error) {
	var scripts []models.ScriptLibrary
	if err := s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&scripts).Error; err != nil {
		return nil, fmt.Errorf("获取脚本库失败: %w", err)
	}
	return scripts, nil
}

// CreateScript 新建脚本库脚本
func (s *ScriptLibraryService) CreateScript(projectID, name, content, description string) (*models.ScriptLibrary, error) {
	var maxSort int
	s.db.Model(&models.ScriptLibrary{}).Where("project_id = ?", projectID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort)
	script := &models.ScriptLibrary{
		ProjectID: projectID, Name: name, Content: content, Description: description, SortOrder: maxSort + 1,
	}
	if err := s.db.Create(script).Error; err != nil {
		return nil, fmt.Errorf("创建脚本失败: %w", err)
	}
	return script, nil
}

// UpdateScript 更新脚本库脚本
func (s *ScriptLibraryService) UpdateScript(id, name, content, description string) error {
	return s.db.Model(&models.ScriptLibrary{}).Where("id = ?", id).Updates(map[string]interface{}{
		"name": name, "content": content, "description": description,
	}).Error
}

// DeleteScript 删除脚本库脚本
func (s *ScriptLibraryService) DeleteScript(id string) error {
	return s.db.Where("id = ?", id).Delete(&models.ScriptLibrary{}).Error
}
