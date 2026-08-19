package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StoredCookie 是持久化的 Cookie。
//
// 此前每次请求都新建一个 cookiejar，响应里的 Set-Cookie 用完即弃：
// 「先登录、再拿着会话调后续接口」这种最常见的调试流程只能手工把 cookie
// 抄进请求头。改为按项目持久化后，同一项目内的请求自动共享会话。
type StoredCookie struct {
	ID        string `gorm:"primaryKey" json:"id"`
	ProjectID string `gorm:"not null;index:idx_cookie_scope,priority:1" json:"projectId"`
	// Domain / Path / Name 三者共同决定一条 cookie 的身份（RFC 6265）
	Domain string `gorm:"not null;index:idx_cookie_scope,priority:2" json:"domain"`
	Path   string `gorm:"not null;default:/;index:idx_cookie_scope,priority:3" json:"path"`
	Name   string `gorm:"not null;index:idx_cookie_scope,priority:4" json:"name"`
	Value  string `json:"value"`

	Secure   bool   `json:"secure"`
	HTTPOnly bool   `json:"httpOnly"`
	SameSite string `json:"sameSite"` // Lax / Strict / None / Default
	// Expires 为空表示会话 cookie（关闭应用即失效，但仍保留一份便于查看）
	Expires   *time.Time `json:"expires"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// TableName 固定表名，避免 GORM 复数化推断出 stored_cookies 之外的名字。
func (StoredCookie) TableName() string { return "cookies" }

// BeforeCreate 创建前自动生成 UUID
func (c *StoredCookie) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// Expired 判断该 cookie 是否已过期（会话 cookie 永不按时间过期）。
func (c *StoredCookie) Expired(now time.Time) bool {
	return c.Expires != nil && !c.Expires.IsZero() && c.Expires.Before(now)
}
