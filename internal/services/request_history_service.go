package services

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"post-pigeon/internal/models"
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

// PruneOldHistory 清理超过指定天数的请求历史
func (s *RequestHistoryService) PruneOldHistory(moduleID string, days int) error {
	cutoff := time.Now().AddDate(0, 0, -days)
	result := s.db.Where("module_id = ? AND created_at < ?", moduleID, cutoff).Delete(&models.RequestHistory{})
	if result.Error != nil {
		return result.Error
	}
	slog.Info("已清理过期请求历史", "moduleId", moduleID, "deletedCount", result.RowsAffected)
	return nil
}
