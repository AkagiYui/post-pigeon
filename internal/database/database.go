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

	// 通过 DSN 预设 PRAGMA，确保连接池中每一条连接都生效。
	// 注意：foreign_keys / busy_timeout 是「连接级」设置，若用 db.Exec 只会作用于池中某一条连接，
	// 其它连接上外键约束仍是关闭的，级联删除便不可靠——必须写进 DSN 由驱动对每条新连接执行。
	//   - foreign_keys(1)：开启外键约束，使 ON DELETE CASCADE 生效
	//   - journal_mode(WAL)：提高并发读取性能（库级设置，持久化）
	//   - busy_timeout(5000)：写锁忙等待超时（毫秒）
	dsn := dbPath + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("无法打开数据库: %w", err)
	}

	// 自动迁移数据库模型
	if err := autoMigrate(db); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %w", err)
	}

	// 为现有项目初始化排序值（如果尚未设置）
	if err := migrateProjectSortOrder(db); err != nil {
		return nil, fmt.Errorf("项目排序迁移失败: %w", err)
	}

	// 将历史端点的前置/后置脚本迁移为前置/后置操作
	if err := migrateScriptsToOperations(db); err != nil {
		return nil, fmt.Errorf("脚本迁移失败: %w", err)
	}

	slog.Info("数据库初始化完成")
	return db, nil
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
