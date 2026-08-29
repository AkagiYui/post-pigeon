package services

import (
	"time"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// copyEndpointRecord 在事务内复制一个端点记录及其所有关联数据到目标模块/文件夹
// nameOverride 为空时沿用源端点名称
func copyEndpointRecord(tx *gorm.DB, src models.Endpoint, moduleID string, folderID *string,
	nameOverride string, sortOrder ...int,
) (*models.Endpoint, error) {
	name := src.Name
	if nameOverride != "" {
		name = nameOverride
	}

	newEndpoint := src
	newEndpoint.ID = ""
	newEndpoint.ModuleID = moduleID
	newEndpoint.FolderID = folderID
	newEndpoint.Name = name
	newEndpoint.CreatedAt = time.Time{}
	newEndpoint.UpdatedAt = time.Time{}
	// 复制件不再代表同一个外部来源接口，避免后续按 source ID 导入时认领错对象。
	newEndpoint.Source = ""
	newEndpoint.SourceID = ""
	if len(sortOrder) > 0 {
		newEndpoint.SortOrder = sortOrder[0]
	}
	// 关联数据由 cloneEndpointContent 统一复制，避免 GORM 自动保存旧关联或漏表。
	newEndpoint.Params = nil
	newEndpoint.BodyFields = nil
	newEndpoint.Headers = nil
	newEndpoint.Auth = nil
	newEndpoint.Response = nil
	newEndpoint.Examples = nil
	newEndpoint.Schemas = nil
	newEndpoint.Histories = nil
	newEndpoint.Operations = nil
	if err := tx.Create(&newEndpoint).Error; err != nil {
		return nil, err
	}
	if err := cloneEndpointContent(tx, src.ID, newEndpoint.ID, nil); err != nil {
		return nil, err
	}
	return &newEndpoint, nil
}
