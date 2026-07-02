package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GlobalVariable 项目级全局变量：跨环境生效，可在任意环境下使用。
// 优先级低于环境变量（环境变量同名时覆盖全局变量）。
type GlobalVariable struct {
	ID          string `gorm:"primaryKey" json:"id"`
	ProjectID   string `gorm:"not null;index" json:"projectId"`
	Key         string `gorm:"not null" json:"key"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Enabled     bool   `gorm:"not null;default:true" json:"enabled"`
	SortOrder   int    `gorm:"not null;default:0" json:"sortOrder"`
}

// BeforeCreate 创建前自动生成 UUID
func (g *GlobalVariable) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.New().String()
	}
	return nil
}
