package database

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

// TestExportAndRestoreRoundTrip 导出 → 改数据 → 从备份恢复，数据应回到导出时的样子，
// 且恢复前的现场被保留成一份备份（恢复本身也可撤销）。
func TestExportAndRestoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")

	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if err := db.Create(&models.Project{ID: "old", Name: "导出时就有"}).Error; err != nil {
		t.Fatalf("建项目失败: %v", err)
	}

	exported := filepath.Join(dir, "导出.db")
	if err := ExportTo(db, exported); err != nil {
		t.Fatalf("导出失败: %v", err)
	}
	if _, err := os.Stat(exported); err != nil {
		t.Fatalf("导出文件不存在: %v", err)
	}

	// 导出之后再改数据：这些改动应当在恢复后消失
	if err := db.Where("id = ?", "old").Delete(&models.Project{}).Error; err != nil {
		t.Fatalf("删除项目失败: %v", err)
	}
	if err := db.Create(&models.Project{ID: "new", Name: "导出后才加的"}).Error; err != nil {
		t.Fatalf("建项目失败: %v", err)
	}
	closeDB(t, db)

	if err := StageRestore(dbPath, exported); err != nil {
		t.Fatalf("暂存恢复失败: %v", err)
	}
	if PendingRestore(dbPath) == "" {
		t.Fatal("暂存后应存在待恢复文件")
	}

	restored, err := ApplyPendingRestore(dbPath)
	if err != nil {
		t.Fatalf("应用恢复失败: %v", err)
	}
	if !restored {
		t.Fatal("应当发生了恢复")
	}
	if PendingRestore(dbPath) != "" {
		t.Fatal("恢复后待恢复文件应已消失")
	}

	db2, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("恢复后初始化失败: %v", err)
	}
	var oldCount, newCount int64
	db2.Model(&models.Project{}).Where("id = ?", "old").Count(&oldCount)
	db2.Model(&models.Project{}).Where("id = ?", "new").Count(&newCount)
	if oldCount != 1 {
		t.Fatalf("恢复后应能看到导出时的数据，count=%d", oldCount)
	}
	if newCount != 0 {
		t.Fatalf("导出之后的改动应当消失，count=%d", newCount)
	}

	// 恢复前的库被保留成备份
	backups, err := ListBackups(dbPath)
	if err != nil {
		t.Fatalf("列出备份失败: %v", err)
	}
	var found bool
	for _, b := range backups {
		if strings.HasSuffix(b.Name, "-restore") {
			found = true
			if b.SizeBytes <= 0 {
				t.Fatalf("备份大小异常: %+v", b)
			}
		}
	}
	if !found {
		t.Fatalf("恢复前的库应被保留成备份，实际备份列表: %+v", backups)
	}
}

// TestStageRestoreRejectsBadFile 不是本应用数据库的文件必须当场拒绝，
// 而不是等到下次启动才炸。
func TestStageRestoreRejectsBadFile(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")
	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("初始化失败: %v", err)
	}

	cases := map[string][]byte{
		"随便一个文本文件": []byte("这不是数据库"),
		"空文件":      {},
	}
	for name, content := range cases {
		t.Run(name, func(t *testing.T) {
			bad := filepath.Join(dir, "bad.db")
			if err := os.WriteFile(bad, content, 0o600); err != nil {
				t.Fatalf("造文件失败: %v", err)
			}
			if err := StageRestore(dbPath, bad); err == nil {
				t.Fatal("应当拒绝这个文件")
			}
			if PendingRestore(dbPath) != "" {
				t.Fatal("校验失败后不应留下待恢复文件")
			}
		})
	}

	// 结构完整但不是本应用的库，同样要拒绝
	other := filepath.Join(dir, "other.db")
	otherDB := openMigrationDB(t, other)
	if err := otherDB.Exec("CREATE TABLE foo (id integer)").Error; err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if err := StageRestore(dbPath, other); err == nil {
		t.Fatal("应当拒绝非本应用的数据库")
	}
}

// TestListBackupsIgnoresWALSiblings 备份的 -wal / -shm 附属文件不应被当成独立备份。
func TestListBackupsIgnoresWALSiblings(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")
	base := filepath.Base(dbPath) + backupSuffix + "20260101T000000-v1"
	for _, name := range []string{base, base + "-wal", base + "-shm"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o600); err != nil {
			t.Fatalf("造文件失败: %v", err)
		}
	}

	backups, err := ListBackups(dbPath)
	if err != nil {
		t.Fatalf("列出备份失败: %v", err)
	}
	if len(backups) != 1 || backups[0].Name != base {
		t.Fatalf("只应列出备份本体，实际: %+v", backups)
	}
}

// TestApplyPendingRestoreNoop 没有待恢复文件时不应有任何动作。
func TestApplyPendingRestoreNoop(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")
	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	restored, err := ApplyPendingRestore(dbPath)
	if err != nil {
		t.Fatalf("不应报错: %v", err)
	}
	if restored {
		t.Fatal("没有待恢复文件时不应发生恢复")
	}
}
