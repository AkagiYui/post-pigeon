package services

import (
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// EnvironmentService 环境管理服务
type EnvironmentService struct {
	db *gorm.DB
}

// NewEnvironmentService 创建环境服务实例
func NewEnvironmentService(db *gorm.DB) *EnvironmentService {
	return &EnvironmentService{db: db}
}

// ListEnvironments 获取项目下所有环境
func (s *EnvironmentService) ListEnvironments(projectID string) ([]models.Environment, error) {
	var envs []models.Environment
	err := s.db.Where("project_id = ?", projectID).Order("created_at ASC").Find(&envs).Error
	if err != nil {
		return nil, fmt.Errorf("获取环境列表失败: %w", err)
	}
	return envs, nil
}

// GetEnvironment 获取环境详情（包含变量）
func (s *EnvironmentService) GetEnvironment(id string) (*models.Environment, error) {
	var env models.Environment
	err := s.db.Preload("Variables").Where("id = ?", id).First(&env).Error
	if err != nil {
		return nil, fmt.Errorf("获取环境失败: %w", err)
	}
	return &env, nil
}

// CreateEnvironment 创建新环境
func (s *EnvironmentService) CreateEnvironment(projectID string, name string) (*models.Environment, error) {
	env := &models.Environment{
		ProjectID: projectID,
		Name:      name,
	}
	if err := s.db.Create(env).Error; err != nil {
		slog.Error("创建环境失败", "error", err)
		return nil, fmt.Errorf("创建环境失败: %w", err)
	}
	slog.Info("环境已创建", "id", env.ID, "name", env.Name)
	return env, nil
}

// UpdateEnvironment 更新环境名称
func (s *EnvironmentService) UpdateEnvironment(id string, name string) error {
	result := s.db.Model(&models.Environment{}).Where("id = ?", id).Update("name", name)
	if result.Error != nil {
		return fmt.Errorf("更新环境失败: %w", result.Error)
	}
	return nil
}

// DeleteEnvironment 删除环境及其变量
func (s *EnvironmentService) DeleteEnvironment(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 删除环境变量
		if err := tx.Where("environment_id = ?", id).Delete(&models.EnvironmentVariable{}).Error; err != nil {
			return err
		}
		// 删除模块中该环境的前置 URL
		if err := tx.Where("environment_id = ?", id).Delete(&models.ModuleBaseURL{}).Error; err != nil {
			return err
		}
		// 删除环境
		if err := tx.Where("id = ?", id).Delete(&models.Environment{}).Error; err != nil {
			return err
		}
		slog.Info("环境已删除", "id", id)
		return nil
	})
}

// SaveEnvironmentVariables 保存环境的所有变量
func (s *EnvironmentService) SaveEnvironmentVariables(environmentID string, variables []models.EnvironmentVariable) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 先删除旧变量
		if err := tx.Where("environment_id = ?", environmentID).Delete(&models.EnvironmentVariable{}).Error; err != nil {
			return err
		}
		// 创建新变量
		for i := range variables {
			variables[i].ID = ""
			variables[i].EnvironmentID = environmentID
			if err := tx.Create(&variables[i]).Error; err != nil {
				return err
			}
		}
		slog.Info("环境变量已保存", "environmentId", environmentID, "count", len(variables))
		return nil
	})
}

// GetEnvironmentVariables 获取环境的所有变量
func (s *EnvironmentService) GetEnvironmentVariables(environmentID string) ([]models.EnvironmentVariable, error) {
	var variables []models.EnvironmentVariable
	err := s.db.Where("environment_id = ?", environmentID).Order("created_at ASC").Find(&variables).Error
	if err != nil {
		return nil, fmt.Errorf("获取环境变量失败: %w", err)
	}
	return variables, nil
}

// ResolveVariables 替换字符串中的环境变量占位符
// 占位符格式：{{variableName}}
func (s *EnvironmentService) ResolveVariables(environmentID string, input string) (string, error) {
	variables, err := s.GetEnvironmentVariables(environmentID)
	if err != nil {
		return input, err
	}

	// 构建变量映射
	varMap := make(map[string]string)
	for _, v := range variables {
		varMap[v.Key] = v.Value
	}

	// 简单的模板替换
	result := input
	for key, value := range varMap {
		placeholder := "{{" + key + "}}"
		result = replaceAll(result, placeholder, value)
	}

	return result, nil
}

// replaceAll 替换字符串中所有出现的子串
func replaceAll(s, old, new string) string {
	result := ""
	for {
		idx := findIndex(s, old)
		if idx == -1 {
			return result + s
		}
		result += s[:idx] + new
		s = s[idx+len(old):]
	}
}

// findIndex 查找子串位置
func findIndex(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
