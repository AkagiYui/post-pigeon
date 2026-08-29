package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CookieJar 是项目内可命名、可由多个模块共享的一份 Cookie 会话。
// 模块默认绑定自己的私有 Jar；需要 SSO/联调时，可显式绑定同一个 Jar。
type CookieJar struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ProjectID string    `gorm:"not null;index" json:"projectId"`
	Name      string    `gorm:"not null" json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Project   Project   `gorm:"constraint:OnDelete:CASCADE" json:"-"`
}

func (CookieJar) TableName() string { return "cookie_jars" }

func (j *CookieJar) BeforeCreate(tx *gorm.DB) error {
	if j.ID == "" {
		j.ID = uuid.New().String()
	}
	return nil
}

// ModuleCookieBinding 把模块（以及可选的单个环境）绑定到 Cookie Jar。
// EnvironmentID 为空表示模块默认绑定；非空记录覆盖该环境。CookieJarID 为 nil 表示禁用自动 Cookie。
type ModuleCookieBinding struct {
	ID            string     `gorm:"primaryKey" json:"id"`
	ModuleID      string     `gorm:"not null;index:idx_module_cookie_binding,unique,priority:1" json:"moduleId"`
	EnvironmentID string     `gorm:"not null;default:'';index:idx_module_cookie_binding,unique,priority:2" json:"environmentId"`
	CookieJarID   *string    `gorm:"index" json:"cookieJarId"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	Module        Module     `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	CookieJar     *CookieJar `gorm:"constraint:OnDelete:RESTRICT" json:"-"`
}

func (ModuleCookieBinding) TableName() string { return "module_cookie_bindings" }

func (b *ModuleCookieBinding) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

// StoredCookie 是某个命名 Cookie Jar 中持久化的一条 Cookie。
type StoredCookie struct {
	ID          string `gorm:"primaryKey" json:"id"`
	CookieJarID string `gorm:"not null;index:idx_cookie_jar_scope,unique,priority:1" json:"cookieJarId"`
	// Domain / Path / Name 三者共同决定一条 cookie 的身份（RFC 6265）
	Domain string `gorm:"not null;index:idx_cookie_jar_scope,unique,priority:2" json:"domain"`
	Path   string `gorm:"not null;default:/;index:idx_cookie_jar_scope,unique,priority:3" json:"path"`
	Name   string `gorm:"not null;index:idx_cookie_jar_scope,unique,priority:4" json:"name"`
	Value  string `json:"value"`

	Secure    bool       `json:"secure"`
	HTTPOnly  bool       `json:"httpOnly"`
	HostOnly  bool       `json:"hostOnly"` // true 时只发给种下 Cookie 的主机，不扩散到子域名
	SameSite  string     `json:"sameSite"` // Lax / Strict / None / Default
	Expires   *time.Time `json:"expires"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	CookieJar CookieJar  `gorm:"constraint:OnDelete:CASCADE" json:"-"`
}

func (StoredCookie) TableName() string { return "cookie_jar_cookies" }

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
