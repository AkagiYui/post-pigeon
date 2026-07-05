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

// GetEnvironment 获取环境详情（包含变量，按排序序号排列）
func (s *EnvironmentService) GetEnvironment(id string) (*models.Environment, error) {
	var env models.Environment
	err := s.db.Preload("Variables", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Where("id = ?", id).First(&env).Error
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
//
// 环境变量、以及各模块在该环境下的前置 URL 均由数据库外键 ON DELETE CASCADE 自动级联删除。
func (s *EnvironmentService) DeleteEnvironment(id string) error {
	if err := s.db.Where("id = ?", id).Delete(&models.Environment{}).Error; err != nil {
		return fmt.Errorf("删除环境失败: %w", err)
	}
	slog.Info("环境已删除", "id", id)
	return nil
}

// SaveEnvironmentVariables 保存环境的所有变量
func (s *EnvironmentService) SaveEnvironmentVariables(environmentID string, variables []models.EnvironmentVariable) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 先删除旧变量
		if err := tx.Where("environment_id = ?", environmentID).Delete(&models.EnvironmentVariable{}).Error; err != nil {
			return err
		}
		// 创建新变量，按传入顺序设置排序序号
		for i := range variables {
			variables[i].ID = ""
			variables[i].EnvironmentID = environmentID
			variables[i].SortOrder = i // 按传入顺序设置排序序号
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
	err := s.db.Where("environment_id = ?", environmentID).Order("sort_order ASC").Find(&variables).Error
	if err != nil {
		return nil, fmt.Errorf("获取环境变量失败: %w", err)
	}
	return variables, nil
}

// ApplyVariableChanges 将脚本产生的变量增量持久化回环境：
// upserts 为新增/修改的键值（不存在则创建，存在则更新），removed 为需删除的键。
func (s *EnvironmentService) ApplyVariableChanges(environmentID string, upserts map[string]string, removed []string) error {
	if environmentID == "" || (len(upserts) == 0 && len(removed) == 0) {
		return nil
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		for key, value := range upserts {
			var existing models.EnvironmentVariable
			err := tx.Where("environment_id = ? AND key = ?", environmentID, key).First(&existing).Error
			if err == gorm.ErrRecordNotFound {
				var maxOrder int
				tx.Model(&models.EnvironmentVariable{}).
					Where("environment_id = ?", environmentID).
					Select("COALESCE(MAX(sort_order), -1)").Scan(&maxOrder)
				nv := models.EnvironmentVariable{
					EnvironmentID: environmentID,
					Key:           key,
					Value:         value,
					Enabled:       true,
					SortOrder:     maxOrder + 1,
				}
				if err := tx.Create(&nv).Error; err != nil {
					return err
				}
			} else if err == nil {
				if err := tx.Model(&existing).Update("value", value).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}
		for _, key := range removed {
			if err := tx.Where("environment_id = ? AND key = ?", environmentID, key).
				Delete(&models.EnvironmentVariable{}).Error; err != nil {
				return err
			}
		}
		slog.Info("脚本变量增量已持久化", "environmentId", environmentID, "upserts", len(upserts), "removed", len(removed))
		return nil
	})
}

// ResolveVariables 替换字符串中的环境变量占位符
// 占位符格式：{{variableName}}
func (s *EnvironmentService) ResolveVariables(environmentID string, input string) (string, error) {
	variables, err := s.GetEnvironmentVariables(environmentID)
	if err != nil {
		return input, err
	}

	// 按变量的排序顺序依次替换（确定性：避免 map 遍历顺序导致嵌套变量结果不稳定）
	// variables 已按 sort_order 升序返回；同名变量以先出现者为准
	result := input
	for _, v := range variables {
		if v.Enabled {
			result = replaceAll(result, "{{"+v.Key+"}}", v.Value)
		}
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
