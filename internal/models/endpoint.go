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
	BodyTypeXML        BodyType = "xml"    // application/xml
	BodyTypeBinary     BodyType = "binary" // 原始二进制（单文件），BodyContent 存 {"fileName":..,"content":<base64>}
)

// EndpointType 端点类型：普通 HTTP 接口、Markdown 文档、WebSocket、SSE
type EndpointType string

const (
	EndpointTypeHTTP      EndpointType = "http"
	EndpointTypeDoc       EndpointType = "doc"
	EndpointTypeWebSocket EndpointType = "websocket"
	EndpointTypeSSE       EndpointType = "sse"
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

// Endpoint 端点，属于模块或文件夹。通过 Type 区分 HTTP 接口 / 文档 / WebSocket / SSE。
type Endpoint struct {
	ID              string  `gorm:"primaryKey" json:"id"`
	ModuleID        string  `gorm:"not null;index" json:"moduleId"`
	FolderID        *string `gorm:"index" json:"folderId"`
	Name            string  `gorm:"not null" json:"name"`
	Type            string  `gorm:"default:http" json:"type"` // http, doc, websocket, sse
	Method          string  `gorm:"not null;default:GET" json:"method"`
	Path            string  `gorm:"not null;default:/" json:"path"`
	BodyType        string  `gorm:"default:none" json:"bodyType"`
	BodyContent     string  `gorm:"type:text" json:"bodyContent"`
	ContentType     string  `json:"contentType"`
	Timeout         int     `gorm:"default:30000" json:"timeout"`
	FollowRedirects bool    `gorm:"default:true" json:"followRedirects"`
	// 文档正文（Type=doc 时的 Markdown 内容）
	DocContent string `gorm:"type:text" json:"docContent"`
	// 接口元数据
	Status      string `json:"status"`                // developing, released, deprecated, ...
	Tags        string `gorm:"type:text" json:"tags"` // JSON 字符串数组
	Description string `gorm:"type:text" json:"description"`
	// InheritOperations 是否继承上级（文件夹/模块）的前置后置操作，默认继承
	InheritOperations bool `gorm:"default:true" json:"inheritOperations"`
	// DisabledGlobalParams 本接口禁用的全局(模块)查询参数名列表，JSON 字符串数组。
	// 仅影响本接口是否附加对应的模块自动参数，不改变模块级参数自身的启用状态。
	DisabledGlobalParams string `gorm:"type:text" json:"disabledGlobalParams"`
	// PreRequestScript 前置脚本，请求发送前执行（JavaScript）——旧字段，保留以兼容历史数据
	PreRequestScript string `gorm:"type:text" json:"preRequestScript"`
	// PostResponseScript 后置脚本，响应返回后执行（JavaScript）——旧字段，保留以兼容历史数据
	PostResponseScript string    `gorm:"type:text" json:"postResponseScript"`
	SortOrder          int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`

	// 关联（constraint:OnDelete:CASCADE 使删除端点时，数据库自动级联删除下列关联数据）
	Params     []EndpointParam     `gorm:"constraint:OnDelete:CASCADE" json:"params,omitempty"`
	BodyFields []EndpointBodyField `gorm:"constraint:OnDelete:CASCADE" json:"bodyFields,omitempty"`
	Headers    []EndpointHeader    `gorm:"constraint:OnDelete:CASCADE" json:"headers,omitempty"`
	Auth       *EndpointAuth       `gorm:"constraint:OnDelete:CASCADE" json:"auth,omitempty"`
	Response   *Response           `gorm:"constraint:OnDelete:CASCADE" json:"response,omitempty"`
	Examples   []ResponseExample   `gorm:"constraint:OnDelete:CASCADE" json:"examples,omitempty"`
	Schemas    []ResponseSchema    `gorm:"constraint:OnDelete:CASCADE" json:"schemas,omitempty"`
	// 请求历史通过 endpoint_id（可空）关联，删除端点时其历史一并级联删除
	Histories []RequestHistory `gorm:"foreignKey:EndpointID;constraint:OnDelete:CASCADE" json:"-"`
	// Operations 为多态关联（owner_type+owner_id），无法用外键级联，删除时在服务层显式清理
	Operations []Operation `gorm:"-" json:"operations,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (e *Endpoint) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EndpointParam 端点参数。Type 表示参数位置：query（查询）、path（路径）、cookie。
// 请求头参数单独存于 EndpointHeader。
type EndpointParam struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"not null;index" json:"endpointId"`
	Type        string `gorm:"not null;default:query" json:"type"` // query, path, cookie
	Name        string `gorm:"not null" json:"name"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	// DataType 值类型：string, integer, number, boolean, array, object, file
	DataType string `gorm:"default:string" json:"dataType"`
	// Required 是否必填
	Required bool `json:"required"`
	// Example 示例值
	Example string `json:"example"`
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
	Enabled    bool   `json:"enabled"`
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
	Enabled     bool   `json:"enabled"`
	// Required 是否必填
	Required bool `json:"required"`
	// Example 示例值
	Example string `json:"example"`
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
	AuthTypeNone    AuthType = "none"
	AuthTypeBasic   AuthType = "basic"
	AuthTypeBearer  AuthType = "bearer"
	AuthTypeAPIKey  AuthType = "apikey"
	AuthTypeInherit AuthType = "inherit" // 继承上级（文件夹/模块）的认证
)

// EndpointAuth 端点认证信息
type EndpointAuth struct {
	ID         string `gorm:"primaryKey" json:"id"`
	EndpointID string `gorm:"primaryKey" json:"endpointId"`
	Type       string `gorm:"default:none" json:"type"` // none, basic, bearer, apikey, inherit
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

// APIKeyAuthData API Key 认证数据（可放入请求头 / 查询参数 / Cookie）
type APIKeyAuthData struct {
	Key   string `json:"key"`   // 参数名
	Value string `json:"value"` // 参数值
	In    string `json:"in"`    // header, query, cookie
}
