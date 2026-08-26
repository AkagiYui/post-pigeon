package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"PostPigeon/internal/config"
	"PostPigeon/internal/database"
	"PostPigeon/internal/models"

	"gorm.io/gorm"
)

// newTestDataService 在独立目录里建库，返回服务与底层连接。
func newTestDataService(t *testing.T) (*DataService, *gorm.DB) {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")
	db, err := database.Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化测试数据库失败: %v", err)
	}
	cfg := &config.Config{DataDir: dir, LogsDir: filepath.Join(dir, "logs"), DBPath: dbPath}
	return NewDataService(db, cfg), db
}

// fillHistories 塞入若干条带大响应体的历史记录，把库撑大。
func fillHistories(t *testing.T, db *gorm.DB, moduleID string, count int) {
	t.Helper()
	body := strings.Repeat("x", 64*1024)
	for i := 0; i < count; i++ {
		h := &models.RequestHistory{
			ID:           fmt.Sprintf("h%d", i),
			ModuleID:     moduleID,
			Method:       "GET",
			URL:          "https://example.com",
			StatusCode:   200,
			ResponseBody: body,
		}
		if err := db.Create(h).Error; err != nil {
			t.Fatalf("写入历史失败: %v", err)
		}
	}
}

// TestGetDatabaseInfoReportsSize 体积概况应反映真实磁盘占用与可回收空间。
func TestGetDatabaseInfoReportsSize(t *testing.T) {
	svc, db := newTestDataService(t)
	project := mustCreateProject(t, db, "数据维护")
	module, err := NewModuleService(db).CreateModule(project.ID, "模块")
	if err != nil {
		t.Fatalf("建模块失败: %v", err)
	}

	info, err := svc.GetDatabaseInfo()
	if err != nil {
		t.Fatalf("读取体积失败: %v", err)
	}
	if info.Path == "" || info.DataDir == "" {
		t.Fatalf("路径信息缺失: %+v", info)
	}
	baseline := info.SizeBytes
	if baseline <= 0 {
		t.Fatalf("体积应为正数，实际 %d", baseline)
	}

	fillHistories(t, db, module.ID, 40)
	grown, err := svc.GetDatabaseInfo()
	if err != nil {
		t.Fatalf("读取体积失败: %v", err)
	}
	if grown.SizeBytes <= baseline {
		t.Fatalf("写入数据后体积应变大：%d → %d", baseline, grown.SizeBytes)
	}
}

// TestCompactDatabaseShrinksFile 删除数据后文件不会自己变小，压缩之后才会。
func TestCompactDatabaseShrinksFile(t *testing.T) {
	svc, db := newTestDataService(t)
	project := mustCreateProject(t, db, "数据维护")
	module, err := NewModuleService(db).CreateModule(project.ID, "模块")
	if err != nil {
		t.Fatalf("建模块失败: %v", err)
	}
	fillHistories(t, db, module.ID, 60)

	full, err := svc.GetDatabaseInfo()
	if err != nil {
		t.Fatalf("读取体积失败: %v", err)
	}

	if err := db.Where("module_id = ?", module.ID).Delete(&models.RequestHistory{}).Error; err != nil {
		t.Fatalf("清理历史失败: %v", err)
	}

	afterDelete, err := svc.GetDatabaseInfo()
	if err != nil {
		t.Fatalf("读取体积失败: %v", err)
	}
	if afterDelete.ReclaimableBytes <= 0 {
		t.Fatal("删除数据后应有可回收空间，实际为 0")
	}

	compacted, err := svc.CompactDatabase()
	if err != nil {
		t.Fatalf("压缩失败: %v", err)
	}
	if compacted.SizeBytes >= full.SizeBytes {
		t.Fatalf("压缩后体积应下降：%d → %d", full.SizeBytes, compacted.SizeBytes)
	}
	if compacted.ReclaimableBytes != 0 {
		t.Fatalf("压缩后不应再有可回收空间，实际 %d", compacted.ReclaimableBytes)
	}

	// 压缩不能动数据：项目与模块必须还在，且库仍可写
	var projects int64
	db.Model(&models.Project{}).Count(&projects)
	if projects != 1 {
		t.Fatalf("压缩后项目丢失，count=%d", projects)
	}
	fillHistories(t, db, module.ID, 1)
}

// TestExportListAndRestore 服务层的导出 → 列出备份 → 暂存恢复串起来能走通。
// （带原生对话框的入口需要 Wails 应用实例，这里直接测下面那层。）
func TestExportListAndRestore(t *testing.T) {
	svc, db := newTestDataService(t)
	mustCreateProject(t, db, "导出验证")

	dst := filepath.Join(t.TempDir(), "导出的备份.db")
	if err := svc.exportTo(dst); err != nil {
		t.Fatalf("导出失败: %v", err)
	}
	stat, err := os.Stat(dst)
	if err != nil {
		t.Fatalf("导出文件不存在: %v", err)
	}
	if stat.Size() <= 0 {
		t.Fatal("导出文件为空")
	}

	if err := svc.RestoreBackup(dst); err != nil {
		t.Fatalf("暂存恢复失败: %v", err)
	}
	if svc.GetPendingRestore() == "" {
		t.Fatal("应存在待恢复文件")
	}

	svc.CancelRestore()
	if svc.GetPendingRestore() != "" {
		t.Fatal("撤销后不应再有待恢复文件")
	}

	// 空路径与不存在的文件都要被拒绝
	if err := svc.RestoreBackup(""); err == nil {
		t.Fatal("空路径应被拒绝")
	}
	if err := svc.RestoreBackup(filepath.Join(t.TempDir(), "不存在.db")); err == nil {
		t.Fatal("不存在的文件应被拒绝")
	}

	backups, err := svc.ListBackups()
	if err != nil {
		t.Fatalf("列出备份失败: %v", err)
	}
	if len(backups) != 0 {
		t.Fatalf("全新库不该有自动备份，实际: %+v", backups)
	}
}
