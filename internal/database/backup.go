package database

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

// backupKeep 是保留的迁移前备份份数，超出的按时间从旧到新删除。
const backupKeep = 3

// backupSuffix 是备份文件名中固定的分隔片段，形如 postpigeon.db.bak-20060102T150405-v5。
// 时间戳排在标签之前，保证按文件名排序即按时间排序。
const backupSuffix = ".bak-"

// backupBeforeMigrate 在「库里已有数据、且本次确有迁移要跑」时，为数据库做一份快照。
//
// 备份失败按致命错误处理：宁可这次启动不了（数据原样保留，由用户腾出空间后重试），
// 也不要在没有退路的情况下改动 schema——迁移一旦跑坏，没有备份就无从恢复。
func backupBeforeMigrate(db *gorm.DB, dbPath string, preGoose bool) error {
	label, pending, err := pendingBackupLabel(db, preGoose)
	if err != nil {
		return err
	}
	if !pending {
		return nil
	}

	path, err := snapshotDB(db, dbPath, label)
	if err != nil {
		return fmt.Errorf("迁移前备份数据库失败（磁盘空间不足或目录不可写？）: %w", err)
	}
	slog.Info("迁移前已备份数据库", "backup", path)

	pruneBackups(dbPath)
	return nil
}

// pendingBackupLabel 判断本次启动是否有待应用的迁移，并给出备份文件名里的来源标签。
//
// 三种情形：
//   - 全新库（无业务表也无版本表）：没有数据可丢，不备份。
//   - 历史库（有业务表无版本表）：即将走 adoptLegacyDB，标记为 legacy。
//   - goose 库：文件里存在任一未登记的迁移版本才算有待应用迁移；
//     库版本高于二进制已知版本（用户降级）时不算，此时 goose.Up 是空操作。
func pendingBackupLabel(db *gorm.DB, preGoose bool) (string, bool, error) {
	if preGoose {
		return "legacy", true, nil
	}
	if !tableExists(db, "goose_db_version") {
		return "", false, nil // 全新库
	}

	applied, err := appliedVersions(db)
	if err != nil {
		return "", false, err
	}
	versions, err := allMigrationVersions()
	if err != nil {
		return "", false, err
	}
	var maxApplied int64
	for v := range applied {
		if v > maxApplied {
			maxApplied = v
		}
	}
	for _, v := range versions {
		if !applied[v] {
			return fmt.Sprintf("v%d", maxApplied), true, nil
		}
	}
	return "", false, nil
}

// appliedVersions 读取 goose 版本表中已应用的版本号集合。
func appliedVersions(db *gorm.DB) (map[int64]bool, error) {
	var versions []int64
	if err := db.Raw("SELECT version_id FROM goose_db_version WHERE is_applied = 1").Scan(&versions).Error; err != nil {
		return nil, fmt.Errorf("读取 goose 版本失败: %w", err)
	}
	applied := make(map[int64]bool, len(versions))
	for _, v := range versions {
		applied[v] = true
	}
	return applied, nil
}

// snapshotDB 用 VACUUM INTO 把当前库导出成一个独立文件，返回备份路径。
//
// 用 VACUUM INTO 而不是拷贝文件：它经由连接读取，天然包含尚未 checkpoint 的 WAL 内容，
// 拿到的是一致性快照；产物是单个普通 db 文件，恢复时直接覆盖回去即可。
func snapshotDB(db *gorm.DB, dbPath, label string) (string, error) {
	dir := filepath.Dir(dbPath)
	base := filepath.Base(dbPath)
	stamp := time.Now().Format("20060102T150405")

	// VACUUM INTO 要求目标文件不存在；同一秒内重复触发时补一个序号。
	dst := filepath.Join(dir, fmt.Sprintf("%s%s%s-%s", base, backupSuffix, stamp, label))
	for i := 1; fileExists(dst); i++ {
		dst = filepath.Join(dir, fmt.Sprintf("%s%s%s-%s-%d", base, backupSuffix, stamp, label, i))
	}

	if err := db.Exec("VACUUM INTO ?", dst).Error; err != nil {
		return "", err
	}
	return dst, nil
}

// pruneBackups 只保留最近 backupKeep 份备份。清理失败不影响启动，仅记日志：
// 备份已经做完，删不掉旧文件顶多占点磁盘。
func pruneBackups(dbPath string) {
	dir := filepath.Dir(dbPath)
	prefix := filepath.Base(dbPath) + backupSuffix

	entries, err := os.ReadDir(dir)
	if err != nil {
		slog.Warn("清理旧备份失败", "error", err)
		return
	}
	var backups []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), prefix) {
			backups = append(backups, e.Name())
		}
	}
	if len(backups) <= backupKeep {
		return
	}
	// 文件名以时间戳打头，字典序即时间序
	sort.Strings(backups)
	for _, name := range backups[:len(backups)-backupKeep] {
		if err := os.Remove(filepath.Join(dir, name)); err != nil {
			slog.Warn("删除旧备份失败", "file", name, "error", err)
			continue
		}
		slog.Info("已删除旧备份", "file", name)
	}
}

// fileExists 判断路径是否已存在。
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
