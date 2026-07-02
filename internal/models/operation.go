package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OperationStage 操作阶段：前置（请求前）或后置（响应后）
type OperationStage string

const (
	OperationStagePre  OperationStage = "pre"
	OperationStagePost OperationStage = "post"
)

// OperationOwnerType 操作归属层级
type OperationOwnerType string

const (
	OperationOwnerEndpoint OperationOwnerType = "endpoint"
	OperationOwnerFolder   OperationOwnerType = "folder"
	OperationOwnerModule   OperationOwnerType = "module"
)

// OperationType 操作类型（对齐 Apifox 前置/后置操作）
// 参考：https://docs.apifox.com/pre-post-processors
type OperationType string

const (
	OpTypeScript        OperationType = "script"        // 自定义脚本（JavaScript）
	OpTypeLibraryScript OperationType = "libraryScript" // 引用项目脚本库中的脚本
	OpTypeAssert        OperationType = "assert"        // 断言
	OpTypeExtractVar    OperationType = "extractVar"    // 提取变量
	OpTypeWait          OperationType = "wait"          // 等待（延时）
	OpTypeInherit       OperationType = "inherit"       // 继承标记：在此处运行上级继承的操作
)

// Operation 前置/后置操作。可归属于端点、文件夹或模块，按 SortOrder 顺序执行，可单独启用/禁用。
type Operation struct {
	ID        string `gorm:"primaryKey" json:"id"`
	OwnerType string `gorm:"not null;index:idx_op_owner" json:"ownerType"` // endpoint, folder, module
	OwnerID   string `gorm:"not null;index:idx_op_owner" json:"ownerId"`
	Stage     string `gorm:"not null" json:"stage"` // pre, post
	Type      string `gorm:"not null" json:"type"`  // script, libraryScript, assert, extractVar, wait, inherit
	Name      string `json:"name"`
	Enabled   bool   `gorm:"default:true" json:"enabled"`
	SortOrder int    `gorm:"default:0" json:"sortOrder"`
	// Data 类型相关配置（JSON 字符串）
	Data string `gorm:"type:text" json:"data"`
}

// BeforeCreate 创建前自动生成 UUID
func (o *Operation) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}

// ScriptOperationData script / libraryScript 操作的数据
type ScriptOperationData struct {
	Script    string `json:"script"`    // 内联脚本内容
	LibraryID string `json:"libraryId"` // 引用脚本库脚本 ID（libraryScript 时使用）
}

// AssertOperationData 断言操作的数据
type AssertOperationData struct {
	Source     string `json:"source"`     // responseJson, responseText, responseHeader, statusCode, responseTime
	Expression string `json:"expression"` // JSONPath / 表达式（source=responseJson 时为 JSONPath，如 $.code）
	Comparison string `json:"comparison"` // eq, neq, contains, notContains, gt, lt, gte, lte, exists, notExists, isNull, notNull
	Target     string `json:"target"`     // 期望值
}

// ExtractVarOperationData 提取变量操作的数据
type ExtractVarOperationData struct {
	Variable   string `json:"variable"`   // 目标变量名
	Scope      string `json:"scope"`      // environment, global, collection, local
	Source     string `json:"source"`     // responseJson, responseHeader, responseText
	Expression string `json:"expression"` // JSONPath / 头名
}

// WaitOperationData 等待操作的数据
type WaitOperationData struct {
	Milliseconds int `json:"milliseconds"`
}
