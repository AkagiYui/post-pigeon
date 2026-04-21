package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BodyType 请求体类型
type BodyType string

const (
	BodyTypeNone       BodyType = "none"
	BodyTypeFormData   BodyType = "form-data"
	BodyTypeURLEncoded BodyType = "x-www-form-urlencoded"
	BodyTypeJSON       BodyType = "json"
	BodyTypeText       BodyType = "text"
)

// HTTPMethod 常见的 HTTP 方法
type HTTPMethod string

const (
	MethodGet     HTTPMethod = "GET"
	MethodPost    HTTPMethod = "POST"
	MethodPut     HTTPMethod = "PUT"
	MethodDelete  HTTPMethod = "DELETE"
	MethodPatch   HTTPMethod = "PATCH"
	MethodHead    HTTPMethod = "HEAD"
	MethodOptions HTTPMethod = "OPTIONS"
)

// Endpoint 端点，属于模块或文件夹
type Endpoint struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	ModuleID        string    `gorm:"not null;index" json:"moduleId"`
	FolderID        *string   `gorm:"index" json:"folderId"`
	Name            string    `gorm:"not null" json:"name"`
	Method          string    `gorm:"not null;default:GET" json:"method"`
	Path            string    `gorm:"not null;default:/" json:"path"`
	BodyType        string    `gorm:"default:none" json:"bodyType"`
	BodyContent     string    `gorm:"type:text" json:"bodyContent"`
	ContentType     string    `json:"contentType"`
	Timeout         int       `gorm:"default:30000" json:"timeout"`
	FollowRedirects bool      `gorm:"default:true" json:"followRedirects"`
	SortOrder       int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`

	// 关联
	Params     []EndpointParam     `json:"params,omitempty"`
	BodyFields []EndpointBodyField `json:"bodyFields,omitempty"`
	Headers    []EndpointHeader    `json:"headers,omitempty"`
	Auth       *EndpointAuth       `json:"auth,omitempty"`
	Response   *Response           `json:"response,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *Endpoint) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EndpointParam 端点查询参数
type EndpointParam struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"not null;index" json:"endpointId"`
	Type        string `gorm:"not null;default:query" json:"type"` // query
	Name        string `gorm:"not null" json:"name"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Enabled     bool   `gorm:"default:true" json:"enabled"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *EndpointParam) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EndpointBodyField 端点请求体字段（form-data 和 urlencoded）
type EndpointBodyField struct {
	ID         string `gorm:"primaryKey" json:"id"`
	EndpointID string `gorm:"not null;index" json:"endpointId"`
	Name       string `gorm:"not null" json:"name"`
	Value      string `json:"value"`
	FieldType  string `gorm:"default:text" json:"fieldType"` // text, file
	Enabled    bool   `gorm:"default:true" json:"enabled"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *EndpointBodyField) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EndpointHeader 端点请求头
type EndpointHeader struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"not null;index" json:"endpointId"`
	Name        string `gorm:"not null" json:"name"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Enabled     bool   `gorm:"default:true" json:"enabled"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *EndpointHeader) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// AuthType 认证类型
type AuthType string

const (
	AuthTypeNone   AuthType = "none"
	AuthTypeBasic  AuthType = "basic"
	AuthTypeBearer AuthType = "bearer"
)

// EndpointAuth 端点认证信息
type EndpointAuth struct {
	ID         string `gorm:"primaryKey" json:"id"`
	EndpointID string `gorm:"primaryKey" json:"endpointId"`
	Type       string `gorm:"default:none" json:"type"` // none, basic, bearer
	Data       string `json:"data"`                     // JSON 格式存储认证数据
}

// BeforeCreate 创建前自动生成 UUID
func (e *EndpointAuth) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// BasicAuthData Basic Auth 认证数据
type BasicAuthData struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// BearerAuthData Bearer Token 认证数据
type BearerAuthData struct {
	Token string `json:"token"`
}
