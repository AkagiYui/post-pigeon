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

	slog.Info("数据库初始化完成")
	return db, nil
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
