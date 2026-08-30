package database

import (
	"path/filepath"
	"testing"

	"gorm.io/gorm"

	"PostPigeon/internal/models"
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

// TestRequestRunSchema 验证实际请求执行链的 run/attempt 表可用且级联关系完整。
func TestRequestRunSchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "request-run.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if !db.Migrator().HasColumn(&models.Response{}, "request_run_id") ||
		!db.Migrator().HasColumn(&models.RequestHistory{}, "request_run_id") {
		t.Fatal("响应和历史缺少 request_run_id 迁移列")
	}
	if !db.Migrator().HasColumn(&models.RequestRun{}, "configured_request") {
		t.Fatal("请求执行链缺少 configured_request 迁移列")
	}

	project := &models.Project{ID: "p-run", Name: "P"}
	module := &models.Module{ID: "m-run", ProjectID: project.ID, Name: "M"}
	endpoint := &models.Endpoint{ID: "e-run", ModuleID: module.ID, Name: "E", Method: "GET", Path: "/"}
	if err := db.Create(project).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(module).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(endpoint).Error; err != nil {
		t.Fatal(err)
	}
	run := &models.RequestRun{
		ID: "run", ModuleID: module.ID, EndpointID: &endpoint.ID,
		PreparedRequest: &models.HTTPRequestSnapshot{Method: "GET", URL: "https://example.test"},
		Attempts: []models.RequestAttempt{{
			ID: "attempt", Sequence: 0, Cause: models.RequestAttemptCauseInitial,
			Request: models.HTTPRequestSnapshot{Method: "GET", URL: "https://example.test"},
		}},
	}
	if err := db.Create(run).Error; err != nil {
		t.Fatalf("保存请求执行链失败: %v", err)
	}
	if err := db.Delete(endpoint).Error; err != nil {
		t.Fatal(err)
	}
	var runCount, attemptCount int64
	db.Model(&models.RequestRun{}).Where("id = ?", run.ID).Count(&runCount)
	db.Model(&models.RequestAttempt{}).Where("run_id = ?", run.ID).Count(&attemptCount)
	if runCount != 0 || attemptCount != 0 {
		t.Fatalf("删除接口后仍残留 run=%d attempt=%d", runCount, attemptCount)
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

// closeDB 关闭连接，避免同一文件上并存多个连接池。
func closeDB(t *testing.T, db *gorm.DB) {
	t.Helper()
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("取底层连接失败: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("关闭数据库失败: %v", err)
	}
}
