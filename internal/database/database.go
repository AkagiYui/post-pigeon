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

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("无法打开数据库: %w", err)
	}

	// 启用 WAL 模式以提高并发读取性能
	db.Exec("PRAGMA journal_mode=WAL")
	// 启用外键约束
	db.Exec("PRAGMA foreign_keys=ON")
	// 设置忙等待超时（毫秒）
	db.Exec("PRAGMA busy_timeout=5000")

	// 自动迁移数据库模型
	if err := autoMigrate(db); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %w", err)
	}

	// 为现有项目初始化排序值（如果尚未设置）
	if err := migrateProjectSortOrder(db); err != nil {
		return nil, fmt.Errorf("项目排序迁移失败: %w", err)
	}

	slog.Info("数据库初始化完成")
	return db, nil
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
		&models.Module{},
		&models.ModuleBaseURL{},
		&models.Folder{},
		&models.Endpoint{},
		&models.EndpointParam{},
		&models.EndpointBodyField{},
		&models.EndpointHeader{},
		&models.EndpointAuth{},
		&models.Response{},
		&models.RequestHistory{},
		&models.Settings{},
	)
}
