package services

import (
	"fmt"

	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// InheritedOperation 是供编辑器展示的继承操作。Operation.Enabled 已替换为
// 当前作用域的有效值；ParentEnabled 用于“恢复跟随上级”。
type InheritedOperation struct {
	Operation     models.Operation `json:"operation"`
	SourceType    string           `json:"sourceType"`
	SourceID      string           `json:"sourceId"`
	SourceName    string           `json:"sourceName"`
	ParentEnabled bool             `json:"parentEnabled"`
	Overridden    bool             `json:"overridden"`
}

type operationWithSource struct {
	op         models.Operation
	sourceName string
	enabled    bool
}

// inheritedOperationsForFolder 返回当前文件夹从模块和祖先文件夹继承到的操作，
// 并应用祖先及当前文件夹的逐条覆盖。
func inheritedOperationsForFolder(db *gorm.DB, folder *models.Folder) []InheritedOperation {
	chain := folderChainToRoot(db, folder.ParentID) // parent -> root
	return resolveInheritedOperations(db, folder.ModuleID, reverseStrings(chain),
		models.OperationOwnerFolder, folder.ID)
}

// inheritedOperationsForEndpoint 返回接口从模块和文件夹链继承到的操作。
func inheritedOperationsForEndpoint(db *gorm.DB, ep *models.Endpoint) []InheritedOperation {
	chain := reverseStrings(folderChainToRoot(db, ep.FolderID)) // root -> leaf
	return resolveInheritedOperations(db, ep.ModuleID, chain,
		models.OperationOwnerEndpoint, ep.ID)
}

func reverseStrings(values []string) []string {
	result := append([]string(nil), values...)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	return result
}

func resolveInheritedOperations(db *gorm.DB, moduleID string, folderIDs []string,
	currentOwnerType models.OperationOwnerType, currentOwnerID string,
) []InheritedOperation {
	var module models.Module
	_ = db.Select("id", "name").Where("id = ?", moduleID).First(&module).Error
	items := make([]operationWithSource, 0)
	for _, op := range loadAllOperations(db, models.OperationOwnerModule, moduleID) {
		items = append(items, operationWithSource{op: op, sourceName: module.Name, enabled: op.Enabled})
	}

	for _, folderID := range folderIDs {
		applyOperationOverrides(db, models.OperationOwnerFolder, folderID, items, nil)
		var folder models.Folder
		_ = db.Select("id", "name").Where("id = ?", folderID).First(&folder).Error
		for _, op := range loadAllOperations(db, models.OperationOwnerFolder, folderID) {
			items = append(items, operationWithSource{op: op, sourceName: folder.Name, enabled: op.Enabled})
		}
	}

	parentEnabled := make(map[string]bool, len(items))
	for _, item := range items {
		parentEnabled[item.op.ID] = item.enabled
	}
	overridden := make(map[string]bool)
	applyOperationOverrides(db, currentOwnerType, currentOwnerID, items, overridden)

	result := make([]InheritedOperation, 0, len(items))
	for _, item := range items {
		op := item.op
		op.Enabled = item.enabled
		result = append(result, InheritedOperation{
			Operation: op, SourceType: op.OwnerType, SourceID: op.OwnerID,
			SourceName: item.sourceName, ParentEnabled: parentEnabled[op.ID],
			Overridden: overridden[op.ID],
		})
	}
	return result
}

func applyOperationOverrides(db *gorm.DB, ownerType models.OperationOwnerType, ownerID string,
	items []operationWithSource, overridden map[string]bool,
) {
	if ownerID == "" || len(items) == 0 {
		return
	}
	var overrides []models.OperationOverride
	db.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID).Find(&overrides)
	values := make(map[string]bool, len(overrides))
	for _, override := range overrides {
		values[override.OperationID] = override.Enabled
	}
	for i := range items {
		if enabled, ok := values[items[i].op.ID]; ok {
			items[i].enabled = enabled
			if overridden != nil {
				overridden[items[i].op.ID] = true
			}
		}
	}
}

func loadAllOperations(db *gorm.DB, ownerType models.OperationOwnerType, ownerID string) []models.Operation {
	var ops []models.Operation
	db.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID).
		Order("stage ASC, sort_order ASC").Find(&ops)
	return ops
}

// saveOperationOverrides 整体同步当前作用域的显式覆盖。只允许覆盖真正继承的操作，
// 以免过期或伪造的 operationId 留在数据库中。
func saveOperationOverrides(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string,
	overrides []models.OperationOverride, inherited []InheritedOperation,
) error {
	allowed := make(map[string]bool, len(inherited))
	for _, item := range inherited {
		allowed[item.Operation.ID] = true
	}
	if err := tx.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID).
		Delete(&models.OperationOverride{}).Error; err != nil {
		return err
	}
	for i := range overrides {
		if !allowed[overrides[i].OperationID] {
			continue
		}
		overrides[i].ID = ""
		overrides[i].OwnerType = string(ownerType)
		overrides[i].OwnerID = ownerID
		if err := tx.Create(&overrides[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func deleteOperationOverrides(tx *gorm.DB, ownerType models.OperationOwnerType, ownerIDs []string) error {
	if len(ownerIDs) == 0 {
		return nil
	}
	return tx.Where("owner_type = ? AND owner_id IN ?", ownerType, ownerIDs).
		Delete(&models.OperationOverride{}).Error
}

// syncOperations 保留已有操作 ID，同步增删改并按阶段重新编号。
func syncOperations(tx *gorm.DB, ownerType models.OperationOwnerType, ownerID string, ops []models.Operation) error {
	var existing []models.Operation
	if err := tx.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID).Find(&existing).Error; err != nil {
		return err
	}
	existingIDs := make(map[string]bool, len(existing))
	for _, op := range existing {
		existingIDs[op.ID] = true
	}
	kept := make([]string, 0, len(ops))
	stageOrder := map[string]int{}
	for i := range ops {
		op := &ops[i]
		op.OwnerType, op.OwnerID = string(ownerType), ownerID
		op.SortOrder = stageOrder[op.Stage]
		stageOrder[op.Stage]++
		if op.ID != "" && existingIDs[op.ID] {
			if err := tx.Model(&models.Operation{}).Where("id = ?", op.ID).Updates(map[string]any{
				"stage": op.Stage, "phase": op.Phase, "type": op.Type, "name": op.Name, "enabled": op.Enabled,
				"sort_order": op.SortOrder, "data": op.Data,
			}).Error; err != nil {
				return err
			}
		} else {
			op.ID = ""
			if err := tx.Create(op).Error; err != nil {
				return err
			}
		}
		kept = append(kept, op.ID)
	}
	query := tx.Where("owner_type = ? AND owner_id = ?", ownerType, ownerID)
	if len(kept) > 0 {
		query = query.Where("id NOT IN ?", kept)
	}
	if err := query.Delete(&models.Operation{}).Error; err != nil {
		return fmt.Errorf("删除已移除操作: %w", err)
	}
	return nil
}
