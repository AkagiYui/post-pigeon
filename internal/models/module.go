package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Module 模块，属于项目
type Module struct {
	ID        string `gorm:"primaryKey" json:"id"`
	ProjectID string `gorm:"not null;index" json:"projectId"`
	Name      string `gorm:"not null" json:"name"`
	SortOrder int    `gorm:"default:0" json:"sortOrder"`
	// AuthType/AuthData 模块级默认认证，供下级接口 inherit
	AuthType string `gorm:"default:none" json:"authType"` // none, basic, bearer, apikey
	AuthData string `gorm:"type:text" json:"authData"`
	// EndpointDisplay 该模块下接口在树中的显示方式：name（名称，默认）或 url（路径）
	EndpointDisplay string `gorm:"default:name" json:"endpointDisplay"`
	// WSProtocolConversion WebSocket 协议头自动转换档位。空字符串表示继承项目。
	WSProtocolConversion string `gorm:"type:text" json:"wsProtocolConversion"`
	// 以下请求设置均为空/NULL时继承项目。
	ProxyConfig        string    `gorm:"type:text" json:"proxyConfig"`
	TLSConfig          string    `gorm:"type:text" json:"tlsConfig"`
	URLEncoding        string    `gorm:"type:text" json:"urlEncoding"`
	TimeoutMode        string    `gorm:"type:text;default:value" json:"timeoutMode"`
	Timeout            int       `gorm:"default:0" json:"timeout"`
	FollowRedirects    *bool     `json:"followRedirects"`
	SendNoCacheHeaders *bool     `json:"sendNoCacheHeaders"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`

	// 关联（constraint:OnDelete:CASCADE 使删除模块时，数据库自动级联删除其下所有内容）
	BaseURLs  []ModuleBaseURL  `gorm:"constraint:OnDelete:CASCADE" json:"baseUrls,omitempty"`
	Params    []ModuleParam    `gorm:"constraint:OnDelete:CASCADE" json:"params,omitempty"`
	Variables []ModuleVariable `gorm:"constraint:OnDelete:CASCADE" json:"variables,omitempty"`
	Endpoints []Endpoint       `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	Folders   []Folder         `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	Histories []RequestHistory `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	// Operations 为多态关联（owner_type+owner_id），无法用外键级联，删除时在服务层显式清理
	Operations []Operation `gorm:"-" json:"operations,omitempty"`
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
	if m.TimeoutMode == "" {
		m.TimeoutMode = string(TimeoutInherit)
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

// ModuleVariable 模块级变量：仅对该模块下的接口可见，跨环境生效。
// 优先级介于全局变量与环境变量之间（环境变量同名时覆盖模块变量，模块变量覆盖全局变量）。
type ModuleVariable struct {
	ID          string `gorm:"primaryKey" json:"id"`
	ModuleID    string `gorm:"not null;index" json:"moduleId"`
	Key         string `gorm:"not null" json:"key"`
	Value       string `json:"value"`
	Description string `json:"description"`
	// Enabled 是否启用，默认启用。
	// 注意：不能用 gorm default:true，否则 GORM 会丢弃 bool 零值 false，导致"禁用"无法保存
	Enabled bool `gorm:"not null" json:"enabled"`
	// SortOrder 排序序号，用于拖拽排序
	SortOrder int `gorm:"not null;default:0" json:"sortOrder"`
	// IsSecret 是否为秘密变量，秘密变量的值在前端默认显示为密码，并参与历史脱敏
	IsSecret bool `gorm:"not null;default:false" json:"isSecret"`
}

// BeforeCreate 创建前自动生成 UUID
func (m *ModuleVariable) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
