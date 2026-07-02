package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ResponseExample 保存的响应示例（对应 Apifox responseExamples）
type ResponseExample struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"not null;index" json:"endpointId"`
	Name        string `gorm:"not null" json:"name"`
	StatusCode  int    `gorm:"default:200" json:"statusCode"`
	ContentType string `json:"contentType"` // json, xml, html, text, ...
	Body        string `gorm:"type:text" json:"body"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
}

// BeforeCreate 创建前自动生成 UUID
func (r *ResponseExample) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// ResponseSchema 响应定义（状态码 + JSON Schema，对应 Apifox responses）
type ResponseSchema struct {
	ID          string `gorm:"primaryKey" json:"id"`
	EndpointID  string `gorm:"not null;index" json:"endpointId"`
	Name        string `json:"name"`
	StatusCode  int    `gorm:"default:200" json:"statusCode"`
	ContentType string `json:"contentType"`
	Schema      string `gorm:"type:text" json:"schema"` // JSON Schema 字符串
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
}

// BeforeCreate 创建前自动生成 UUID
func (r *ResponseSchema) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
