package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Folder 文件夹，支持递归嵌套
type Folder struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ModuleID  string    `gorm:"not null;index" json:"moduleId"`
	ParentID  *string   `gorm:"index" json:"parentId"`
	Name      string    `gorm:"not null" json:"name"`
	SortOrder int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// 关联（不存储，仅用于查询）
	Children  []Folder   `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Endpoints []Endpoint `gorm:"foreignKey:FolderID" json:"endpoints,omitempty"`
}

// BeforeCreate 创建前自动生成 UUID
func (f *Folder) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}
