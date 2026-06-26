package services

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"post-pigeon/internal/database"
	"post-pigeon/internal/models"

	"gorm.io/gorm"
)

// TestMain 静音日志，保持测试输出整洁
func TestMain(m *testing.M) {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	os.Exit(m.Run())
}

// newTestDB 创建一个隔离的临时 SQLite 测试数据库（走真实的 Initialize 路径）
func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := database.Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化测试数据库失败: %v", err)
	}
	return db
}

// waitFor 轮询等待条件成立（最多 ~2s），用于验证异步操作
func waitFor(cond func() bool) bool {
	for i := 0; i < 200; i++ {
		if cond() {
			return true
		}
		time.Sleep(10 * time.Millisecond)
	}
	return cond()
}

// mustCreateProject 创建项目并断言成功
func mustCreateProject(t *testing.T, db *gorm.DB, name string) *models.Project {
	t.Helper()
	p, err := NewProjectService(db).CreateProject(name, "desc-"+name)
	if err != nil {
		t.Fatalf("创建项目失败: %v", err)
	}
	if p == nil || p.ID == "" {
		t.Fatalf("创建项目返回空 ID")
	}
	return p
}

// defaultModule 返回项目的默认模块
func defaultModule(t *testing.T, db *gorm.DB, projectID string) models.Module {
	t.Helper()
	mods, err := NewModuleService(db).ListModules(projectID)
	if err != nil {
		t.Fatalf("获取模块列表失败: %v", err)
	}
	if len(mods) == 0 {
		t.Fatalf("项目没有默认模块")
	}
	return mods[0]
}

// firstEnvironment 返回项目的第一个环境
func firstEnvironment(t *testing.T, db *gorm.DB, projectID string) models.Environment {
	t.Helper()
	envs, err := NewEnvironmentService(db).ListEnvironments(projectID)
	if err != nil {
		t.Fatalf("获取环境列表失败: %v", err)
	}
	if len(envs) == 0 {
		t.Fatalf("项目没有默认环境")
	}
	return envs[0]
}
