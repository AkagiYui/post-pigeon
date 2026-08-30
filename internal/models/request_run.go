package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	RequestRunOutcomeRunning   = "running"
	RequestRunOutcomeCompleted = "completed"
	RequestRunOutcomeFailed    = "failed"
	RequestRunOutcomeCancelled = "cancelled"
	RequestRunOutcomeTimedOut  = "timed_out"
	RequestRunOutcomeSkipped   = "skipped"
	RequestRunOutcomeStreaming = "streaming"
)

const (
	RequestAttemptCauseInitial            = "initial"
	RequestAttemptCauseRedirect           = "redirect"
	RequestAttemptCauseDigest             = "digest"
	RequestAttemptCauseRetry              = "retry"
	RequestAttemptCauseSSEReconnect       = "sse_reconnect"
	RequestAttemptCauseWebSocketHandshake = "websocket_handshake"
)

// HTTPHeaderSnapshot 保留一个实际请求头值。使用数组而不是 map，避免丢失重复请求头。
type HTTPHeaderSnapshot struct {
	Name      string `json:"name"`
	Value     string `json:"value"`
	Source    string `json:"source,omitempty"`
	Sensitive bool   `json:"sensitive,omitempty"`
	Redacted  bool   `json:"redacted,omitempty"`
}

// HTTPBodyPart 是 multipart/form-data 或表单请求体的一个结构化字段。
type HTTPBodyPart struct {
	Name         string `json:"name"`
	FileName     string `json:"fileName,omitempty"`
	ContentType  string `json:"contentType,omitempty"`
	Size         int64  `json:"size"`
	SHA256       string `json:"sha256,omitempty"`
	Preview      string `json:"preview,omitempty"`
	PreviewCodec string `json:"previewCodec,omitempty"`
	Truncated    bool   `json:"truncated,omitempty"`
	Sensitive    bool   `json:"sensitive,omitempty"`
}

// HTTPBodySnapshot 同时保存可展示的有界预览与完整数据的长度/哈希。
// PreviewCodec 为 utf8 或 base64；Captured=false 表示 Body 不可重放，仅捕获到元数据。
type HTTPBodySnapshot struct {
	Kind         string         `json:"kind"`
	MediaType    string         `json:"mediaType,omitempty"`
	Charset      string         `json:"charset,omitempty"`
	Size         int64          `json:"size"`
	SHA256       string         `json:"sha256,omitempty"`
	Preview      string         `json:"preview,omitempty"`
	PreviewCodec string         `json:"previewCodec,omitempty"`
	Truncated    bool           `json:"truncated,omitempty"`
	Captured     bool           `json:"captured"`
	Sensitive    bool           `json:"sensitive,omitempty"`
	Parts        []HTTPBodyPart `json:"parts,omitempty"`
}

// HTTPRequestSnapshot 是某次真正进入 RoundTripper 的语义化请求快照。
// HTTP/2/3 不伪装成 HTTP/1 原始报文；Authority、RequestTarget、Protocol 单独保存。
type HTTPRequestSnapshot struct {
	Method           string               `json:"method"`
	URL              string               `json:"url"`
	URLSensitive     bool                 `json:"urlSensitive,omitempty"`
	RequestTarget    string               `json:"requestTarget"`
	Authority        string               `json:"authority"`
	Protocol         string               `json:"protocol"`
	Headers          []HTTPHeaderSnapshot `json:"headers"`
	Body             HTTPBodySnapshot     `json:"body"`
	ContentLength    int64                `json:"contentLength"`
	TransferEncoding []string             `json:"transferEncoding,omitempty"`
	CaptureLevel     string               `json:"captureLevel"`
}

// HTTPResponseSummary 用于把请求 Attempt 与它产生的响应关联起来。
type HTTPResponseSummary struct {
	StatusCode int                  `json:"statusCode"`
	Status     string               `json:"status"`
	Protocol   string               `json:"protocol"`
	Headers    []HTTPHeaderSnapshot `json:"headers,omitempty"`
}

// HTTPTransportInfo 是连接层诊断信息，不与 HTTP Header 混在一起。
type HTTPTransportInfo struct {
	Protocol      string `json:"protocol,omitempty"`
	LocalAddress  string `json:"localAddress,omitempty"`
	RemoteAddress string `json:"remoteAddress,omitempty"`
	Reused        bool   `json:"reused,omitempty"`
	WasIdle       bool   `json:"wasIdle,omitempty"`
	TLSVersion    string `json:"tlsVersion,omitempty"`
	TLSCipher     string `json:"tlsCipher,omitempty"`
	ServerName    string `json:"serverName,omitempty"`
}

// RequestAttemptError 记录发送阶段错误；有 Attempt 不代表一定收到响应。
type RequestAttemptError struct {
	Phase   string `json:"phase,omitempty"`
	Code    string `json:"code,omitempty"`
	Message string `json:"message"`
}

// RequestAttempt 表示一次真正进入网络传输层的请求。
type RequestAttempt struct {
	ID              string               `gorm:"primaryKey" json:"id"`
	RunID           string               `gorm:"not null;index" json:"runId"`
	Sequence        int                  `gorm:"not null" json:"sequence"`
	Cause           string               `gorm:"not null" json:"cause"`
	ParentAttemptID *string              `gorm:"index" json:"parentAttemptId"`
	Request         HTTPRequestSnapshot  `gorm:"serializer:json;type:text" json:"request"`
	Response        *HTTPResponseSummary `gorm:"serializer:json;type:text" json:"response"`
	Transport       HTTPTransportInfo    `gorm:"serializer:json;type:text" json:"transport"`
	ErrorInfo       *RequestAttemptError `gorm:"serializer:json;type:text" json:"error"`
	StartedAt       time.Time            `json:"startedAt"`
	CompletedAt     *time.Time           `json:"completedAt"`
}

func (a *RequestAttempt) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// RequestRun 是一次点击“发送”的完整执行记录。Attempts 为不可变追加的网络请求链。
type RequestRun struct {
	ID                string               `gorm:"primaryKey" json:"id"`
	ModuleID          string               `gorm:"not null;index" json:"moduleId"`
	EndpointID        *string              `gorm:"index" json:"endpointId"`
	Outcome           string               `gorm:"not null;index" json:"outcome"`
	ConfiguredRequest *HTTPRequestSnapshot `gorm:"serializer:json;type:text" json:"configuredRequest"`
	PreparedRequest   *HTTPRequestSnapshot `gorm:"serializer:json;type:text" json:"preparedRequest"`
	SelectedAttemptID *string              `gorm:"index" json:"selectedAttemptId"`
	ErrorInfo         *RequestAttemptError `gorm:"serializer:json;type:text" json:"error"`
	StartedAt         time.Time            `gorm:"index" json:"startedAt"`
	CompletedAt       *time.Time           `json:"completedAt"`
	CreatedAt         time.Time            `json:"createdAt"`
	Attempts          []RequestAttempt     `gorm:"foreignKey:RunID;constraint:OnDelete:CASCADE" json:"attempts"`
	Persisted         bool                 `gorm:"-" json:"persisted"`
}

func (r *RequestRun) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	if r.Outcome == "" {
		r.Outcome = RequestRunOutcomeRunning
	}
	if r.StartedAt.IsZero() {
		r.StartedAt = time.Now()
	}
	return nil
}
