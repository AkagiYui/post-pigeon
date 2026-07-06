// Package database 提供数据库初始化和连接管理
package database

import (
	"fmt"
	"log/slog"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"post-pigeon/internal/models"
)

// Initialize 初始化数据库连接并执行自动迁移
func Initialize(dbPath string) (*gorm.DB, error) {
	slog.Info("正在初始化数据库", "path", dbPath)

	// 迁移与运行时使用不同的外键设置，二者缺一不可：
	//
	// 【迁移阶段：外键必须关闭】
	// 为已有的表补建外键约束时，glebarez 需要「建新表 → 拷数据 → DROP 旧表 → 改名」。
	// 若外键处于开启状态，DROP 一个被其它表引用的父表（如 modules 被 endpoints 引用）会触发
	// 隐式 DELETE，进而违反子表外键，报 “FOREIGN KEY constraint failed (787)”。
	// 半迁移状态（部分表已带外键）下尤其必然触发。因此迁移连接不启用 foreign_keys。
	//
	// 【运行时阶段：外键必须开启】
	// 只有开启 foreign_keys，ON DELETE CASCADE 才会生效；且它是「连接级」设置，
	// 必须写进 DSN 由驱动对连接池中每条连接执行（用 db.Exec 只作用于单条连接，不可靠）。
	if err := migrate(dbPath); err != nil {
		return nil, err
	}

	dsn := dbPath + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("无法打开数据库: %w", err)
	}

	slog.Info("数据库初始化完成")
	return db, nil
}

// migrate 在「外键关闭」的独立连接上执行结构迁移与一次性数据迁移。
// 迁移完成后关闭该连接，运行时另开启用外键的连接。
func migrate(dbPath string) error {
	// 不含 foreign_keys，故此连接上外键默认关闭
	dsn := dbPath + "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("无法打开数据库: %w", err)
	}
	// 迁移结束后释放该连接，避免与运行时连接池并存
	defer func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	// 自动迁移数据库模型（含补建外键约束）
	if err := autoMigrate(db); err != nil {
		return fmt.Errorf("数据库迁移失败: %w", err)
	}

	// 修正历史遗留的非级联外键（AutoMigrate 不会修改已存在的约束）
	if err := fixCascadeConstraints(db); err != nil {
		return fmt.Errorf("外键级联修正失败: %w", err)
	}

	// 为现有项目初始化排序值（如果尚未设置）
	if err := migrateProjectSortOrder(db); err != nil {
		return fmt.Errorf("项目排序迁移失败: %w", err)
	}

	// 将历史端点的前置/后置脚本迁移为前置/后置操作
	if err := migrateScriptsToOperations(db); err != nil {
		return fmt.Errorf("脚本迁移失败: %w", err)
	}

	return nil
}

// migrateScriptsToOperations 将端点上旧的 PreRequestScript/PostResponseScript 字段
// 转换为对应的 script 类型操作（仅在该端点尚无同阶段操作时执行，避免重复迁移）。
func migrateScriptsToOperations(db *gorm.DB) error {
	var endpoints []models.Endpoint
	if err := db.Where("(pre_request_script != '' AND pre_request_script IS NOT NULL) OR (post_response_script != '' AND post_response_script IS NOT NULL)").
		Find(&endpoints).Error; err != nil {
		return err
	}
	if len(endpoints) == 0 {
		return nil
	}
	for _, ep := range endpoints {
		var existing int64
		db.Model(&models.Operation{}).
			Where("owner_type = ? AND owner_id = ?", models.OperationOwnerEndpoint, ep.ID).
			Count(&existing)
		if existing > 0 {
			continue
		}
		if s := ep.PreRequestScript; s != "" {
			db.Create(&models.Operation{
				OwnerType: string(models.OperationOwnerEndpoint), OwnerID: ep.ID,
				Stage: string(models.OperationStagePre), Type: string(models.OpTypeScript),
				Name: "前置脚本", Enabled: true, SortOrder: 0,
				Data: models.ToJSON(models.ScriptOperationData{Script: s}),
			})
		}
		if s := ep.PostResponseScript; s != "" {
			db.Create(&models.Operation{
				OwnerType: string(models.OperationOwnerEndpoint), OwnerID: ep.ID,
				Stage: string(models.OperationStagePost), Type: string(models.OpTypeScript),
				Name: "后置脚本", Enabled: true, SortOrder: 0,
				Data: models.ToJSON(models.ScriptOperationData{Script: s}),
			})
		}
	}
	slog.Info("端点脚本已迁移为操作", "count", len(endpoints))
	return nil
}

// migrateProjectSortOrder 为现有项目初始化排序值
// 对于 sort_order 为 0 的项目，按 updated_at 降序设置排序值
func migrateProjectSortOrder(db *gorm.DB) error {
	var projects []models.Project
	// 找出所有未设置排序（sort_order = 0）且有多个项目的情况
	if err := db.Where("sort_order = 0").Order("updated_at DESC").Find(&projects).Error; err != nil {
		return err
	}

	// 如果有未设置排序的项目，逐个更新
	if len(projects) > 0 {
		slog.Info("正在为现有项目初始化排序值", "count", len(projects))
		// 先获取最大排序值，避免覆盖已有排序的项目
		var maxOrder int64
		db.Model(&models.Project{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)

		for i, project := range projects {
			newOrder := maxOrder + int64(i) + 1
			if err := db.Model(&project).Update("sort_order", newOrder).Error; err != nil {
				return err
			}
		}
		slog.Info("项目排序值初始化完成")
	}
	return nil
}

// cascadeRelations 列出所有应为 ON DELETE CASCADE 的父子关系，
// 以「父模型 + 该模型上的关系字段名」表示（DropConstraint/CreateConstraint 均按此解析）。
// 不含 Operation：它是多态归属，无外键，由服务层显式清理。
func cascadeRelations() []struct {
	model  interface{}
	fields []string
} {
	return []struct {
		model  interface{}
		fields []string
	}{
		{&models.Project{}, []string{"Modules", "Environments", "GlobalVariables", "Scripts"}},
		{&models.Module{}, []string{"BaseURLs", "Params", "Endpoints", "Folders", "Histories"}},
		{&models.Folder{}, []string{"Children", "Endpoints"}},
		{&models.Environment{}, []string{"Variables", "BaseURLs"}},
		{&models.Endpoint{}, []string{"Params", "BodyFields", "Headers", "Auth", "Response", "Examples", "Schemas", "Histories"}},
	}
}

// fixCascadeConstraints 将历史遗留的非级联外键统一重建为 ON DELETE CASCADE。
//
// 背景：早期版本对带关联字段的关系（如 Folder.Endpoints）使用 gorm 默认方式建立了外键，
// 但没有级联动作；而 AutoMigrate 只会「补建缺失的约束」，不会修改已存在的同名约束，
// 因此这些旧外键即便模型已声明 CASCADE 也不会被更新。此处显式删除后重建。
//
// 通过代表性约束（endpoints.folder_id 的 on_delete）判断是否已是级联，
// 全新库或已修正过的库直接跳过，避免每次启动都重建表。
// 必须在「外键关闭」的迁移连接上调用：DropConstraint/CreateConstraint 会重建表，
// 开启外键时重建被引用的父表会触发约束失败。
func fixCascadeConstraints(db *gorm.DB) error {
	if fkOnDelete(db, "endpoints", "folder_id") == "CASCADE" {
		return nil // 已是级联，无需处理
	}
	slog.Info("检测到历史遗留的非级联外键，正在重建为 ON DELETE CASCADE")

	m := db.Migrator()
	for _, rel := range cascadeRelations() {
		for _, field := range rel.fields {
			if m.HasConstraint(rel.model, field) {
				if err := m.DropConstraint(rel.model, field); err != nil {
					return fmt.Errorf("删除旧外键 %T.%s 失败: %w", rel.model, field, err)
				}
			}
			if err := m.CreateConstraint(rel.model, field); err != nil {
				return fmt.Errorf("重建外键 %T.%s 失败: %w", rel.model, field, err)
			}
		}
	}
	slog.Info("外键已全部重建为级联删除")
	return nil
}

// fkOnDelete 返回 table 上以 fromCol 为外键列的 ON DELETE 动作（如 "CASCADE"）；
// 不存在该外键时返回空串。
func fkOnDelete(db *gorm.DB, table, fromCol string) string {
	rows, err := db.Raw("PRAGMA foreign_key_list(" + table + ")").Rows()
	if err != nil {
		return ""
	}
	defer rows.Close()
	for rows.Next() {
		// 列：id, seq, table, from, to, on_update, on_delete, match
		var id, seq int
		var refTable, from, to, onUpdate, onDelete, match string
		if err := rows.Scan(&id, &seq, &refTable, &from, &to, &onUpdate, &onDelete, &match); err != nil {
			return ""
		}
		if from == fromCol {
			return onDelete
		}
	}
	return ""
}

// autoMigrate 执行所有模型的自动迁移
func autoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Project{},
		&models.Environment{},
		&models.EnvironmentVariable{},
		&models.GlobalVariable{},
		&models.Module{},
		&models.ModuleBaseURL{},
		&models.ModuleParam{},
		&models.Folder{},
		&models.Endpoint{},
		&models.EndpointParam{},
		&models.EndpointBodyField{},
		&models.EndpointHeader{},
		&models.EndpointAuth{},
		&models.Operation{},
		&models.ResponseExample{},
		&models.ResponseSchema{},
		&models.ScriptLibrary{},
		&models.Response{},
		&models.RequestHistory{},
		&models.Settings{},
	)
}
