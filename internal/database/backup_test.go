package database

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"PostPigeon/internal/models"
)

// listBackups 返回 dbPath 同目录下的备份文件名。
func listBackups(t *testing.T, dbPath string) []string {
	t.Helper()
	entries, err := os.ReadDir(filepath.Dir(dbPath))
	if err != nil {
		t.Fatalf("读取目录失败: %v", err)
	}
	var names []string
	prefix := filepath.Base(dbPath) + backupSuffix
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), prefix) {
			names = append(names, e.Name())
		}
	}
	return names
}

// TestFreshDBSkipsBackup 全新库没有数据可丢，不应产生备份文件。
func TestFreshDBSkipsBackup(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "fresh.db")
	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if got := listBackups(t, dbPath); len(got) != 0 {
		t.Fatalf("全新库不应备份，却产生了 %v", got)
	}
}

// TestNoPendingMigrationSkipsBackup 无待应用迁移时（含降级：库版本高于二进制）重复启动不应反复备份。
func TestNoPendingMigrationSkipsBackup(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "stable.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	// 伪造一个二进制不认识的更高版本，等价于用户从新版本降级回来
	if err := db.Exec("INSERT INTO goose_db_version (version_id, is_applied) VALUES (9999, 1)").Error; err != nil {
		t.Fatalf("写入未来版本失败: %v", err)
	}
	closeDB(t, db)

	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("二次初始化失败: %v", err)
	}
	if got := listBackups(t, dbPath); len(got) != 0 {
		t.Fatalf("无待应用迁移不应备份，却产生了 %v", got)
	}
}

// TestPendingMigrationCreatesBackup 有待应用迁移时应先备份，且备份里保留着迁移前的数据。
func TestPendingMigrationCreatesBackup(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "pending.db")
	db, err := Initialize(dbPath)
	if err != nil {
		t.Fatalf("初始化失败: %v", err)
	}
	if err := db.Create(&models.Project{ID: "p1", Name: "备份验证"}).Error; err != nil {
		t.Fatalf("建项目失败: %v", err)
	}
	// 抹掉最新一条版本记录，制造「有一条迁移待应用」的局面
	latest, err := latestMigrationVersion()
	if err != nil {
		t.Fatalf("读取最新迁移号失败: %v", err)
	}
	if err := db.Exec("DELETE FROM goose_db_version WHERE version_id = ?", latest).Error; err != nil {
		t.Fatalf("删除版本记录失败: %v", err)
	}
	closeDB(t, db)

	if _, err := Initialize(dbPath); err != nil {
		t.Fatalf("二次初始化失败: %v", err)
	}
	backups := listBackups(t, dbPath)
	if len(backups) != 1 {
		t.Fatalf("应恰好产生 1 份备份，实际 %v", backups)
	}

	// 备份必须是可打开的完整库，且含迁移前的数据
	backupPath := filepath.Join(filepath.Dir(dbPath), backups[0])
	backupDB, err := Initialize(backupPath)
	if err != nil {
		t.Fatalf("备份无法打开: %v", err)
	}
	var n int64
	backupDB.Model(&models.Project{}).Where("id = ?", "p1").Count(&n)
	if n != 1 {
		t.Fatalf("备份里缺少迁移前的数据，count=%d", n)
	}
}

// TestPruneBackupsKeepsLatest 备份份数超出上限时，只保留最近的几份。
func TestPruneBackupsKeepsLatest(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "postpigeon.db")
	stamps := []string{
		"20260101T000000-v1",
		"20260102T000000-v2",
		"20260103T000000-v3",
		"20260104T000000-v4",
		"20260105T000000-v5",
	}
	for _, s := range stamps {
		name := filepath.Base(dbPath) + backupSuffix + s
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o600); err != nil {
			t.Fatalf("造备份文件失败: %v", err)
		}
	}
	// 无关文件不应被误删
	if err := os.WriteFile(filepath.Join(dir, "other.txt"), []byte("x"), 0o600); err != nil {
		t.Fatalf("造无关文件失败: %v", err)
	}

	pruneBackups(dbPath)

	got := listBackups(t, dbPath)
	if len(got) != backupKeep {
		t.Fatalf("应保留 %d 份，实际 %v", backupKeep, got)
	}
	for _, name := range got {
		if strings.HasSuffix(name, "v1") || strings.HasSuffix(name, "v2") {
			t.Fatalf("最旧的备份未被清理: %v", got)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "other.txt")); err != nil {
		t.Fatalf("无关文件被误删: %v", err)
	}
}
