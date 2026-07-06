package database

import (
	"path/filepath"
	"testing"

	"post-pigeon/internal/models"
)

// TestFreshDBUsesGoose 全新数据库应由 goose 建立 schema 并登记到最新版本。
func TestFreshDBUsesGoose(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "fresh.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}

	// goose 版本表应存在，且记录了基线版本
	var applied int64
	if err := db.Raw("SELECT COALESCE(MAX(version_id), -1) FROM goose_db_version WHERE is_applied = 1").Scan(&applied).Error; err != nil {
		t.Fatalf("读取 goose 版本失败: %v", err)
	}
	latest, err := latestMigrationVersion()
	if err != nil {
		t.Fatalf("读取最新迁移号失败: %v", err)
	}
	if applied != latest {
		t.Fatalf("goose 版本 = %d，期望 %d", applied, latest)
	}

	// schema 可用且外键为级联：删项目应连带删模块
	if err := db.Exec("INSERT INTO projects (id, name) VALUES ('p1','P')").Error; err != nil {
		t.Fatalf("插入项目失败: %v", err)
	}
	if err := db.Exec("INSERT INTO modules (id, project_id, name) VALUES ('m1','p1','M')").Error; err != nil {
		t.Fatalf("插入模块失败: %v", err)
	}
	if err := db.Exec("DELETE FROM projects WHERE id = 'p1'").Error; err != nil {
		t.Fatalf("删除项目失败: %v", err)
	}
	var mods int64
	db.Raw("SELECT count(*) FROM modules WHERE project_id = 'p1'").Scan(&mods)
	if mods != 0 {
		t.Fatalf("外键级联未生效：删除项目后残留 %d 个模块", mods)
	}

	// 再次初始化应幂等（goose 无待应用迁移）
	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("二次初始化失败: %v", err)
	}
}

// TestReinitPreservesData 幂等性：对已有数据的库重复初始化不丢数据。
func TestReinitPreservesData(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "reinit.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if err := db.Create(&models.Project{ID: "keep", Name: "保留"}).Error; err != nil {
		t.Fatalf("建项目失败: %v", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.Close()
	}

	db2, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("二次初始化失败: %v", err)
	}
	var n int64
	db2.Model(&models.Project{}).Where("id = ?", "keep").Count(&n)
	if n != 1 {
		t.Fatalf("二次初始化后项目丢失，count=%d", n)
	}
}
