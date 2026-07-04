package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Response 端点最后一次响应，每个端点仅保留一条
type Response struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	EndpointID    string    `gorm:"not null;uniqueIndex" json:"endpointId"`
	StatusCode    int       `json:"statusCode"`
	Headers       string    `gorm:"type:text" json:"headers"`       // JSON 格式
	Body          string    `gorm:"type:text" json:"body"`          // 原始响应体
	ContentType   string    `json:"contentType"`                    // 响应 Content-Type
	Cookies       string    `gorm:"type:text" json:"cookies"`       // JSON 格式
	Timing        string    `json:"timing"`                         // JSON 格式
	Size          int64     `json:"size"`                           // 响应体大小（字节）
	ActualRequest string    `gorm:"type:text" json:"actualRequest"` // JSON 格式，实际发送的请求信息
	CreatedAt     time.Time `json:"createdAt"`
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
	DNSLookup    float64 `json:"dnsLookup"`    // DNS 查询耗时
	TLSHandshake float64 `json:"tlsHandshake"` // TLS 握手耗时
	TCPConnect   float64 `json:"tcpConnect"`   // TCP 连接耗时
	TTFB         float64 `json:"ttfb"`         // 首字节时间（从请求开始到收到首字节）
	Total        float64 `json:"total"`        // 总耗时（含内容下载）
	// 阶段分解（供前端耗时 popover 展示）
	Stalled  float64 `json:"stalled"`  // 准备：请求开始 → 开始建立连接（连接复用时接近 0）
	Wait     float64 `json:"wait"`     // 等待：请求发出 → 收到首字节（服务端处理时间）
	Download float64 `json:"download"` // 下载内容：首字节 → 响应体读取完成
	Reused   bool    `json:"reused"`   // 连接是否复用（DNS/TCP/TLS 命中缓存）
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
