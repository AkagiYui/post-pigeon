package services

import (
	"PostPigeon/internal/models"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"
)

// RequestHistoryService 请求历史服务
type RequestHistoryService struct {
	db *gorm.DB
}

// NewRequestHistoryService 创建请求历史服务实例
func NewRequestHistoryService(db *gorm.DB) *RequestHistoryService {
	return &RequestHistoryService{db: db}
}

// ListHistoryByModule 获取模块的请求历史（按时间倒序）
func (s *RequestHistoryService) ListHistoryByModule(moduleID string, limit int, offset int) ([]models.RequestHistory, error) {
	var history []models.RequestHistory
	if limit <= 0 {
		limit = 50
	}
	err := s.db.Where("module_id = ?", moduleID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&history).Error
	if err != nil {
		return nil, fmt.Errorf("获取请求历史失败: %w", err)
	}
	return history, nil
}

// ListHistoryByProject 获取项目的请求历史（按时间倒序）
func (s *RequestHistoryService) ListHistoryByProject(projectID string, limit int, offset int) ([]models.RequestHistory, error) {
	var history []models.RequestHistory
	if limit <= 0 {
		limit = 50
	}

	// 通过模块关联查询项目的请求历史
	err := s.db.Table("request_histories").
		Joins("JOIN modules ON modules.id = request_histories.module_id").
		Where("modules.project_id = ?", projectID).
		Order("request_histories.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&history).Error
	if err != nil {
		return nil, fmt.Errorf("获取请求历史失败: %w", err)
	}
	return history, nil
}

// GetHistory 获取单条请求历史
func (s *RequestHistoryService) GetHistory(id string) (*models.RequestHistory, error) {
	var history models.RequestHistory
	err := s.db.Where("id = ?", id).First(&history).Error
	if err != nil {
		return nil, fmt.Errorf("获取请求历史失败: %w", err)
	}
	return &history, nil
}

// DeleteHistory 删除单条请求历史
func (s *RequestHistoryService) DeleteHistory(id string) error {
	return s.db.Where("id = ?", id).Delete(&models.RequestHistory{}).Error
}

// ClearModuleHistory 清除模块的所有请求历史
func (s *RequestHistoryService) ClearModuleHistory(moduleID string) error {
	return s.db.Where("module_id = ?", moduleID).Delete(&models.RequestHistory{}).Error
}

// HistoryDetail 请求历史详情
type HistoryDetail struct {
	models.RequestHistory
	TimingInfo *models.TimingInfo `json:"timingInfo,omitempty"`
}

// GetHistoryDetail 获取请求历史详情（包含解析后的计时信息）
func (s *RequestHistoryService) GetHistoryDetail(id string) (*HistoryDetail, error) {
	history, err := s.GetHistory(id)
	if err != nil {
		return nil, err
	}

	detail := &HistoryDetail{RequestHistory: *history}

	// 解析计时信息
	if history.Timing != "" {
		var timing models.TimingInfo
		if err := json.Unmarshal([]byte(history.Timing), &timing); err == nil {
			detail.TimingInfo = &timing
		}
	}

	return detail, nil
}

// PruneOldHistory 清理指定模块中超过指定天数的请求历史。days<=0 表示不清理。
func (s *RequestHistoryService) PruneOldHistory(moduleID string, days int) error {
	if days <= 0 {
		return nil
	}
	cutoff := time.Now().AddDate(0, 0, -days)
	result := s.db.Where("module_id = ? AND created_at < ?", moduleID, cutoff).Delete(&models.RequestHistory{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		slog.Info("已清理过期请求历史", "moduleId", moduleID, "deletedCount", result.RowsAffected)
	}
	return nil
}

// ApplyRetentionPolicy 按当前保留策略清理全部历史：先按天数、再按单模块条数上限。
// 应用启动时调用一次；历史表每行都存着完整的响应快照，没有保留策略就会无限增长。
func (s *RequestHistoryService) ApplyRetentionPolicy() error {
	policy := getHistorySettings(s.db)

	if policy.RetentionDays > 0 {
		cutoff := time.Now().AddDate(0, 0, -policy.RetentionDays)
		result := s.db.Where("created_at < ?", cutoff).Delete(&models.RequestHistory{})
		if result.Error != nil {
			return fmt.Errorf("按保留天数清理请求历史失败: %w", result.Error)
		}
		if result.RowsAffected > 0 {
			slog.Info("已按保留天数清理请求历史", "days", policy.RetentionDays, "deletedCount", result.RowsAffected)
		}
	}

	if policy.MaxRowsPerModule > 0 {
		var moduleIDs []string
		if err := s.db.Model(&models.RequestHistory{}).Distinct().Pluck("module_id", &moduleIDs).Error; err != nil {
			return fmt.Errorf("统计请求历史模块失败: %w", err)
		}
		for _, moduleID := range moduleIDs {
			if err := s.trimModule(moduleID, policy.MaxRowsPerModule); err != nil {
				return err
			}
		}
	}
	return nil
}

// enforceRowLimit 按当前策略裁剪单个模块的历史条数（每次写入历史后调用）。
func (s *RequestHistoryService) enforceRowLimit(moduleID string) error {
	policy := getHistorySettings(s.db)
	if policy.MaxRowsPerModule <= 0 || moduleID == "" {
		return nil
	}
	return s.trimModule(moduleID, policy.MaxRowsPerModule)
}

// trimModule 只保留某模块最新的 maxRows 条历史，其余删除。
// 先数一次再删，避免每次写入都跑一趟子查询删除。
func (s *RequestHistoryService) trimModule(moduleID string, maxRows int) error {
	var count int64
	if err := s.db.Model(&models.RequestHistory{}).Where("module_id = ?", moduleID).Count(&count).Error; err != nil {
		return fmt.Errorf("统计请求历史条数失败: %w", err)
	}
	if count <= int64(maxRows) {
		return nil
	}

	// 取第 maxRows 条的创建时间作为分界线，删除比它更旧的记录
	var boundary models.RequestHistory
	if err := s.db.Where("module_id = ?", moduleID).
		Order("created_at DESC").
		Offset(maxRows - 1).
		Limit(1).
		First(&boundary).Error; err != nil {
		return fmt.Errorf("定位请求历史分界线失败: %w", err)
	}
	result := s.db.Where("module_id = ? AND created_at < ?", moduleID, boundary.CreatedAt).
		Delete(&models.RequestHistory{})
	if result.Error != nil {
		return fmt.Errorf("裁剪请求历史失败: %w", result.Error)
	}
	if result.RowsAffected > 0 {
		slog.Debug("已裁剪超量请求历史", "moduleId", moduleID, "maxRows", maxRows, "deletedCount", result.RowsAffected)
	}
	return nil
}

// ClearAllHistory 清空全部请求历史（设置面板的「立即清空」入口）。
func (s *RequestHistoryService) ClearAllHistory() error {
	// GORM 的批量删除要求带条件，用恒真条件表达「全部」
	return s.db.Where("1 = 1").Delete(&models.RequestHistory{}).Error
}

// PruneNow 按当前保留策略立即清理一次（设置面板的「立即清理」入口）。
func (s *RequestHistoryService) PruneNow() error {
	return s.ApplyRetentionPolicy()
}
