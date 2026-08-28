package services

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
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
	return NewDataService(db, cfg, false), db
}

// fillHistories 塞入若干条带大响应体的历史记录，把库撑大。
func fillHistories(t *testing.T, db *gorm.DB, moduleID string, count int) {
	t.Helper()
	body := strings.Repeat("x", 64*1024)
	for i := range count {
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

// TestWriteDiagnostics 诊断包必须含摘要与最近的日志，且绝不能含数据库文件。
func TestWriteDiagnostics(t *testing.T) {
	svc, db := newTestDataService(t)
	mustCreateProject(t, db, "诊断验证")

	// 造几个日志文件：只应带上最近的 diagnosticsLogCount 份
	if err := os.MkdirAll(svc.cfg.LogsDir, 0o755); err != nil {
		t.Fatalf("建日志目录失败: %v", err)
	}
	logNames := []string{
		"postpigeon-2026-08-20.log",
		"postpigeon-2026-08-21.log",
		"postpigeon-2026-08-22.log",
		"postpigeon-2026-08-23.log",
	}
	for _, name := range logNames {
		if err := os.WriteFile(filepath.Join(svc.cfg.LogsDir, name), []byte("日志内容 "+name), 0o600); err != nil {
			t.Fatalf("造日志失败: %v", err)
		}
	}
	if err := os.WriteFile(filepath.Join(svc.cfg.LogsDir, "无关文件.txt"), []byte("x"), 0o600); err != nil {
		t.Fatalf("造文件失败: %v", err)
	}

	dst := filepath.Join(t.TempDir(), "诊断.zip")
	if err := svc.writeDiagnostics(dst); err != nil {
		t.Fatalf("导出诊断失败: %v", err)
	}

	reader, err := zip.OpenReader(dst)
	if err != nil {
		t.Fatalf("打开诊断包失败: %v", err)
	}
	defer reader.Close()

	var names []string
	var summary string
	for _, f := range reader.File {
		names = append(names, f.Name)
		if f.Name == "summary.txt" {
			rc, err := f.Open()
			if err != nil {
				t.Fatalf("读取摘要失败: %v", err)
			}
			content, _ := io.ReadAll(rc)
			rc.Close()
			summary = string(content)
		}
	}

	if summary == "" {
		t.Fatalf("诊断包里没有摘要，实际内容: %v", names)
	}
	for _, want := range []string{"版本", "平台", "数据库大小", "上次退出"} {
		if !strings.Contains(summary, want) {
			t.Fatalf("摘要里缺少「%s」:\n%s", want, summary)
		}
	}

	// 只带最近 3 份日志，且不含无关文件
	logCount := 0
	for _, name := range names {
		if strings.HasPrefix(name, "logs/") {
			logCount++
		}
		if strings.Contains(name, "无关文件") {
			t.Fatalf("带上了无关文件: %v", names)
		}
		// 数据库绝不能进包：里面是明文凭据
		if strings.Contains(name, ".db") {
			t.Fatalf("诊断包不应含数据库文件: %v", names)
		}
	}
	if logCount != diagnosticsLogCount {
		t.Fatalf("应带 %d 份日志，实际 %d 份: %v", diagnosticsLogCount, logCount, names)
	}
	if !slices.Contains(names, "logs/postpigeon-2026-08-23.log") {
		t.Fatalf("应带上最新的日志: %v", names)
	}
	if slices.Contains(names, "logs/postpigeon-2026-08-20.log") {
		t.Fatalf("最旧的日志不应带上: %v", names)
	}
}

// TestDiagnosticsSummaryReportsCrash 上次异常退出这件事必须写进摘要。
func TestDiagnosticsSummaryReportsCrash(t *testing.T) {
	svc, _ := newTestDataService(t)
	if strings.Contains(svc.diagnosticsSummary(), "异常退出") {
		t.Fatal("正常退出不该写成异常")
	}
	if !svc.GetLastRunCrashed() {
		svc.lastRunCrashed = true
	}
	if !strings.Contains(svc.diagnosticsSummary(), "异常退出") {
		t.Fatal("上次异常退出应写进摘要")
	}
	if !svc.GetLastRunCrashed() {
		t.Fatal("GetLastRunCrashed 应返回 true")
	}
}
