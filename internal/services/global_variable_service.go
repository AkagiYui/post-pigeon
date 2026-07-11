package services

import (
	"fmt"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// GlobalVariableService 项目级全局变量服务
type GlobalVariableService struct {
	db *gorm.DB
}

// NewGlobalVariableService 创建全局变量服务实例
func NewGlobalVariableService(db *gorm.DB) *GlobalVariableService {
	return &GlobalVariableService{db: db}
}

// ListGlobalVariables 列出项目的全局变量
func (s *GlobalVariableService) ListGlobalVariables(projectID string) ([]models.GlobalVariable, error) {
	var vars []models.GlobalVariable
	if err := s.db.Where("project_id = ?", projectID).Order("sort_order ASC").Find(&vars).Error; err != nil {
		return nil, fmt.Errorf("获取全局变量失败: %w", err)
	}
	return vars, nil
}

// SaveGlobalVariables 整体替换项目的全局变量
func (s *GlobalVariableService) SaveGlobalVariables(projectID string, vars []models.GlobalVariable) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("project_id = ?", projectID).Delete(&models.GlobalVariable{}).Error; err != nil {
			return err
		}
		for i := range vars {
			vars[i].ID = ""
			vars[i].ProjectID = projectID
			vars[i].SortOrder = i
			if err := tx.Create(&vars[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
