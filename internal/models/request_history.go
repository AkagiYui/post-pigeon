package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RequestHistory 请求历史记录，按模块组织
type RequestHistory struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	ModuleID   string    `gorm:"not null;index" json:"moduleId"`
	EndpointID *string   `gorm:"index" json:"endpointId"`
	Method     string    `gorm:"not null" json:"method"`
	URL        string    `gorm:"not null" json:"url"`
	StatusCode int       `json:"statusCode"`
	Timing     string    `json:"timing"` // JSON 格式 TimingInfo
	Size       int64     `json:"size"`
	CreatedAt  time.Time `json:"createdAt"`
}

// BeforeCreate 创建前自动生成 UUID
func (r *RequestHistory) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
