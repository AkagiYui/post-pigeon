package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Environment 环境配置，属于项目
type Environment struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ProjectID string    `gorm:"not null;index" json:"projectId"`
	Name      string    `gorm:"not null" json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关联
	Variables []EnvironmentVariable `json:"variables,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *Environment) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EnvironmentVariable 环境变量，属于环境
type EnvironmentVariable struct {
	ID            string `gorm:"primaryKey" json:"id"`
	EnvironmentID string `gorm:"not null;index" json:"environmentId"`
	Key           string `gorm:"not null" json:"key"`
	Value         string `json:"value"`
	Description   string `json:"description"`
	// Enabled 是否启用，默认启用
	Enabled bool `gorm:"not null;default:true" json:"enabled"`
	// SortOrder 排序序号，用于拖拽排序
	SortOrder int `gorm:"not null;default:0" json:"sortOrder"`
	// IsSecret 是否为秘密变量，秘密变量的值在前端默认显示为密码
	IsSecret bool `gorm:"not null;default:false" json:"isSecret"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *EnvironmentVariable) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}
