package services

import (
	"gorm.io/gorm"

	"post-pigeon/internal/models"
)

// deleteOperations 删除一批归属者（端点 / 文件夹 / 模块）的前置/后置操作。
//
// 端点、文件夹、模块下的其余关联数据都由数据库外键 ON DELETE CASCADE 自动清理，
// 唯独 Operation 采用「多态归属」（owner_type + owner_id 指向三种不同的表），
// 无法用普通外键表达，因此删除归属者之前必须在应用层显式清理，避免遗留孤儿数据。
//
// ownerIDs 为空时直接返回，方便调用方无需自行判空。
func deleteOperations(tx *gorm.DB, ownerType models.OperationOwnerType, ownerIDs []string) error {
	if len(ownerIDs) == 0 {
		return nil
	}
	return tx.Where("owner_type = ? AND owner_id IN ?", string(ownerType), ownerIDs).
		Delete(&models.Operation{}).Error
}
