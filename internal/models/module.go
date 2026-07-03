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
	// AuthType/AuthData 模块级默认认证，供下级接口 inherit
	AuthType string `gorm:"default:none" json:"authType"` // none, basic, bearer, apikey
	AuthData string `gorm:"type:text" json:"authData"`
	// EndpointDisplay 该模块下接口在树中的显示方式：name（名称，默认）或 url（路径）
	EndpointDisplay string `gorm:"default:name" json:"endpointDisplay"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关联
	BaseURLs   []ModuleBaseURL `json:"baseUrls,omitempty"`
	Params     []ModuleParam   `json:"params,omitempty"`
	Operations []Operation     `gorm:"-" json:"operations,omitempty"`
}

// ModuleParam 模块级自动参数：请求发送时自动附加到该模块下所有接口。
type ModuleParam struct {
	ID          string `gorm:"primaryKey" json:"id"`
	ModuleID    string `gorm:"not null;index" json:"moduleId"`
	Type        string `gorm:"not null;default:query" json:"type"` // query, header, cookie
	Name        string `gorm:"not null" json:"name"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
}

// BeforeCreate 创建前自动生成 UUID
func (m *ModuleParam) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
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
