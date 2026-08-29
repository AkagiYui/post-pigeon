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
	// BodyTypeGraphQL GraphQL 查询。BodyContent 存 {"query":..,"variables":..}，
	// 实际发送时序列化为标准的 GraphQL over HTTP JSON 请求体。
	BodyTypeGraphQL BodyType = "graphql"
)

// GraphQLBody 是 graphql 请求体在 BodyContent 中的存储形态。
type GraphQLBody struct {
	Query string `json:"query"`
	// Variables 为变量的 JSON 文本；空串表示不带变量
	Variables string `json:"variables"`
	// OperationName 多操作文档时指定入口，可空
	OperationName string `json:"operationName,omitempty"`
}

// EndpointType 端点类型：普通 HTTP 接口、Markdown 文档、WebSocket、SSE
type EndpointType string

const (
	EndpointTypeHTTP      EndpointType = "http"
	EndpointTypeDoc       EndpointType = "doc"
	EndpointTypeWebSocket EndpointType = "websocket"
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
	ID          string  `gorm:"primaryKey" json:"id"`
	ModuleID    string  `gorm:"not null;index" json:"moduleId"`
	FolderID    *string `gorm:"index" json:"folderId"`
	Name        string  `gorm:"not null" json:"name"`
	Type        string  `gorm:"default:http" json:"type"` // http, doc, websocket, sse
	Method      string  `gorm:"not null;default:GET" json:"method"`
	Path        string  `gorm:"not null;default:/" json:"path"`
	BodyType    string  `gorm:"default:none" json:"bodyType"`
	BodyContent string  `gorm:"type:text" json:"bodyContent"`
	ContentType string  `json:"contentType"`
	Timeout     int     `gorm:"default:30000" json:"timeout"`
	// TimeoutMode 为空/inherit 时继承文件夹或模块；unlimited 不限时；value 使用 Timeout。
	// 数据库默认 value 兼容降级后的旧版本，新版本创建时 BeforeCreate 会显式改为 inherit。
	TimeoutMode string `gorm:"type:text;default:value" json:"timeoutMode"`
	// FollowRedirects 是否跟随 3xx 重定向。nil 表示逐层继承，显式 true/false 覆盖。
	// 注意不能带 gorm default，否则 nil 会被写成默认值而丢掉「继承」。
	FollowRedirects *bool `json:"followRedirects"`
	// SendNoCacheHeaders nil 表示继承上级，显式 true/false 覆盖。
	SendNoCacheHeaders *bool `json:"sendNoCacheHeaders"`
	// 文档正文（Type=doc 时的 Markdown 内容）
	DocContent string `gorm:"type:text" json:"docContent"`
	// 接口元数据
	Status      string `json:"status"`                // developing, released, deprecated, ...
	Tags        string `gorm:"type:text" json:"tags"` // JSON 字符串数组
	Description string `gorm:"type:text" json:"description"`
	// InheritOperations 是否继承上级（文件夹/模块）的前置后置操作，默认继承
	// 不使用 gorm default:true：GORM 会把显式 false 当作零值省略，导致新建/复制时重新变成 true。
	// 各创建入口必须明确写入期望值。
	InheritOperations bool `json:"inheritOperations"`
	// Source 这条接口是从哪种格式导入的：apifox / openapi / postman，空表示手工创建。
	// SourceID 是它在来源系统里的稳定标识（Apifox 的接口 ID、OpenAPI 的 operationId）。
	// 两者一起构成来源命名空间——不同格式的 ID 不在一个空间里，必须连 Source 一起比。
	// 重复导入时可据此精确认出「还是那条接口」，改名、改路径、挪目录都不影响。
	Source   string `gorm:"index" json:"source"`
	SourceID string `gorm:"index" json:"sourceId"`
	// DisabledGlobalParams 本接口禁用的全局(模块)查询参数名列表，JSON 字符串数组。
	// 仅影响本接口是否附加对应的模块自动参数，不改变模块级参数自身的启用状态。
	DisabledGlobalParams string `gorm:"type:text" json:"disabledGlobalParams"`
	// ProxyConfig 接口级代理选择（EndpointProxy 的 JSON）。空字符串表示逐层继承。
	ProxyConfig string `gorm:"type:text" json:"proxyConfig"`
	// TLSConfig 接口级 TLS 选择（EndpointTLS 的 JSON）。空字符串表示逐层继承。
	TLSConfig string `gorm:"type:text" json:"tlsConfig"`
	// URLEncoding 接口级 URL 自动编码档位（URLEncodingMode）。空字符串表示逐层继承。
	URLEncoding string `gorm:"type:text" json:"urlEncoding"`
	// WSProtocolConversion WebSocket 协议头自动转换档位。空字符串表示继承文件夹或模块。
	WSProtocolConversion string `gorm:"type:text" json:"wsProtocolConversion"`
	// 以下四项只控制该接口的流式响应展示，不参与实际 HTTP 请求。
	// 采用明确默认值，旧接口迁移后仍保持原有的「分条 + 自动识别 + 不渲染 Markdown」体验。
	StreamViewMode         string `gorm:"type:text;default:timeline" json:"streamViewMode"`
	StreamCompletionFormat string `gorm:"type:text;default:auto" json:"streamCompletionFormat"`
	StreamJSONPath         string `gorm:"type:text" json:"streamJSONPath"`
	StreamRenderMarkdown   bool   `gorm:"default:false" json:"streamRenderMarkdown"`
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
	if e.TimeoutMode == "" {
		e.TimeoutMode = string(TimeoutInherit)
	}
	if e.StreamViewMode == "" {
		e.StreamViewMode = "timeline"
	}
	if e.StreamCompletionFormat == "" {
		e.StreamCompletionFormat = "auto"
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
	AuthTypeDigest  AuthType = "digest"  // HTTP Digest（RFC 7616），需一次 401 挑战往返
	AuthTypeOAuth2  AuthType = "oauth2"  // OAuth 2.0，支持 client_credentials / password 授权
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

// DigestAuthData HTTP Digest 认证数据。
// 其余参数（realm/nonce/qop/algorithm）全部来自服务端的 401 挑战，无需用户填写。
type DigestAuthData struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// OAuth2GrantType OAuth 2.0 授权类型。
// 只支持无需浏览器重定向的两种：授权码流程需要跳转与回调服务，
// 拿到 token 后用 bearer 认证即可，不必在客户端里重复实现。
type OAuth2GrantType string

const (
	OAuth2GrantClientCredentials OAuth2GrantType = "client_credentials"
	OAuth2GrantPassword          OAuth2GrantType = "password"
)

// OAuth2AuthData OAuth 2.0 认证数据。
type OAuth2AuthData struct {
	// GrantType: client_credentials | password
	GrantType    string `json:"grantType"`
	TokenURL     string `json:"tokenUrl"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	Scope        string `json:"scope"`
	// Username / Password 仅 password 授权需要
	Username string `json:"username"`
	Password string `json:"password"`
	// ClientAuth: body（默认，凭据放请求体）| basic（凭据放 Authorization 头）
	ClientAuth string `json:"clientAuth"`
	// HeaderPrefix 注入到 Authorization 的前缀，默认 Bearer
	HeaderPrefix string `json:"headerPrefix"`
}
