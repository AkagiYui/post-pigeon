package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Response 端点最后一次响应，每个端点仅保留一条
type Response struct {
	ID            string      `gorm:"primaryKey" json:"id"`
	EndpointID    string      `gorm:"not null;uniqueIndex" json:"endpointId"`
	RequestRunID  *string     `gorm:"index" json:"requestRunId"`
	RequestRun    *RequestRun `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"requestRun,omitempty"`
	StatusCode    int         `json:"statusCode"`
	Headers       string      `gorm:"type:text" json:"headers"`       // JSON 格式
	Body          string      `gorm:"type:text" json:"body"`          // 原始响应体
	ContentType   string      `json:"contentType"`                    // 响应 Content-Type
	Cookies       string      `gorm:"type:text" json:"cookies"`       // JSON 格式
	Timing        string      `json:"timing"`                         // JSON 格式
	Size          int64       `json:"size"`                           // 响应体大小（字节）
	ActualRequest string      `gorm:"type:text" json:"actualRequest"` // JSON 格式，实际发送的请求信息
	CreatedAt     time.Time   `json:"createdAt"`
}

// BeforeCreate 创建前自动生成 UUID
func (r *Response) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// TimingInfo 请求各阶段计时信息（单位：毫秒，保留亚毫秒精度）
type TimingInfo struct {
	Prepare      float64 `json:"prepare"`      // 准备：进入请求流程 → 开始网络发送
	Socket       float64 `json:"socket"`       // Socket 初始化：等待可用连接 / 开始新连接
	DNSLookup    float64 `json:"dnsLookup"`    // DNS 查询耗时
	TLSHandshake float64 `json:"tlsHandshake"` // TLS 握手耗时
	TCPConnect   float64 `json:"tcpConnect"`   // TCP 连接耗时
	TTFB         float64 `json:"ttfb"`         // 首字节时间（网络开始 → 收到首字节）
	Total        float64 `json:"total"`        // 完整请求生命周期总耗时
	// 阶段分解（供前端耗时 popover 展示）
	Stalled  float64 `json:"stalled"`  // 旧数据兼容：等价于 Socket；新展示读取 socket
	Wait     float64 `json:"wait"`     // 等待：连接就绪 → 收到首字节
	Download float64 `json:"download"` // 下载内容：首字节 → 响应体读取完成
	Process  float64 `json:"process"`  // 处理：响应体读取完成 → 响应交付前
	Reused   bool    `json:"reused"`   // 连接是否复用（DNS/TCP/TLS 命中缓存）
	TLSUsed  bool    `json:"tlsUsed"`  // 是否实际建立了 TLS 连接（用于条件展示 SSL 阶段）
}

// ActualRequestInfo 实际发送的请求信息
type ActualRequestInfo struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// CookieInfo Cookie 信息
type CookieInfo struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain"`
	Path     string `json:"path"`
	Expires  string `json:"expires"`
	HTTPOnly bool   `json:"httpOnly"`
	Secure   bool   `json:"secure"`
	SameSite string `json:"sameSite"`
}
