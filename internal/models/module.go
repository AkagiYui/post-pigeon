package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Module 模块，属于项目
type Module struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ProjectID string    `gorm:"not null;index" json:"projectId"`
	Name      string    `gorm:"not null" json:"name"`
	SortOrder int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关联
	BaseURLs []ModuleBaseURL `json:"baseUrls,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (m *Module) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// ModuleBaseURL 模块在各环境下的前置 URL
type ModuleBaseURL struct {
	ID            string `gorm:"primaryKey" json:"id"`
	ModuleID      string `gorm:"not null;index" json:"moduleId"`
	EnvironmentID string `gorm:"not null;index" json:"environmentId"`
	BaseURL       string `json:"baseUrl"`
}

// BeforeCreate 创建前自动生成 UUID
func (m *ModuleBaseURL) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
