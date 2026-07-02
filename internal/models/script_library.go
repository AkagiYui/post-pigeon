package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ScriptLibrary 项目级脚本库。任意下级的前置/后置操作都可引用其中的脚本。
type ScriptLibrary struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	ProjectID   string    `gorm:"not null;index" json:"projectId"`
	Name        string    `gorm:"not null" json:"name"`
	Content     string    `gorm:"type:text" json:"content"`
	Description string    `gorm:"type:text" json:"description"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// BeforeCreate 创建前自动生成 UUID
func (s *ScriptLibrary) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
