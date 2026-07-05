package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Folder 文件夹，支持递归嵌套
type Folder struct {
	ID        string  `gorm:"primaryKey" json:"id"`
	ModuleID  string  `gorm:"not null;index" json:"moduleId"`
	ParentID  *string `gorm:"index" json:"parentId"`
	Name      string  `gorm:"not null" json:"name"`
	SortOrder int     `gorm:"default:0" json:"sortOrder"`
	// AuthType/AuthData 文件夹级默认认证，供下级接口 inherit
	AuthType  string    `gorm:"default:inherit" json:"authType"` // inherit, none, basic, bearer, apikey
	AuthData  string    `gorm:"type:text" json:"authData"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关联（constraint:OnDelete:CASCADE 使删除文件夹时，数据库自动级联删除子文件夹及其下端点）
	Children  []Folder   `gorm:"foreignKey:ParentID;constraint:OnDelete:CASCADE" json:"children,omitempty"`
	Endpoints []Endpoint `gorm:"foreignKey:FolderID;constraint:OnDelete:CASCADE" json:"endpoints,omitempty"`
	// Operations 为多态关联（owner_type+owner_id），无法用外键级联，删除时在服务层显式清理
	Operations []Operation `gorm:"-" json:"operations,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (f *Folder) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}
