package database

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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
		if !e.IsDir() && isBackupName(e.Name(), prefix) {
			backups = append(backups, e.Name())
		}
	}
	if len(backups) <= backupKeep {
		return
	}
	// 文件名以时间戳打头，字典序即时间序
	sort.Strings(backups)
	for _, name := range backups[:len(backups)-backupKeep] {
		path := filepath.Join(dir, name)
		if err := os.Remove(path); err != nil {
			slog.Warn("删除旧备份失败", "file", name, "error", err)
			continue
		}
		// 附属的 WAL 文件跟着走，别把半份备份留在原地
		for _, suffix := range []string{"-wal", "-shm"} {
			_ = os.Remove(path + suffix)
		}
		slog.Info("已删除旧备份", "file", name)
	}
}

// fileExists 判断路径是否已存在。
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// pendingRestoreSuffix 是「待恢复」文件的后缀。恢复不能在应用运行中原地替换数据库
// 文件（连接还开着、WAL 也还在），所以先把候选文件放到这里，下次启动时在打开数据库
// 之前完成替换。
const pendingRestoreSuffix = ".restore-pending"

// BackupFile 是数据目录里的一份备份。
type BackupFile struct {
	// Path 备份文件的完整路径
	Path string `json:"path"`
	// Name 文件名
	Name string `json:"name"`
	// SizeBytes 文件大小
	SizeBytes int64 `json:"sizeBytes"`
	// CreatedAt 文件修改时间，即备份产生的时间
	CreatedAt time.Time `json:"createdAt"`
}

// ListBackups 列出数据目录里的备份，按时间从新到旧。
func ListBackups(dbPath string) ([]BackupFile, error) {
	dir := filepath.Dir(dbPath)
	prefix := filepath.Base(dbPath) + backupSuffix

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var backups []BackupFile
	for _, e := range entries {
		if e.IsDir() || !isBackupName(e.Name(), prefix) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		backups = append(backups, BackupFile{
			Path:      filepath.Join(dir, e.Name()),
			Name:      e.Name(),
			SizeBytes: info.Size(),
			CreatedAt: info.ModTime(),
		})
	}
	sort.Slice(backups, func(i, j int) bool { return backups[i].Name > backups[j].Name })
	return backups, nil
}

// isBackupName 判断文件名是否是一份备份本体。
//
// 排除 -wal / -shm：它们是某份备份的附属文件（恢复前保留现场时会连带改名），
// 不该被当成独立的备份列出来，也不该被单独清理掉。
func isBackupName(name, prefix string) bool {
	if !strings.HasPrefix(name, prefix) {
		return false
	}
	return !strings.HasSuffix(name, "-wal") && !strings.HasSuffix(name, "-shm")
}

// ExportTo 把当前数据库导出成 dst 处的独立数据库文件，用于用户主动备份。
//
// 先写临时文件再改名：VACUUM INTO 要求目标不存在，而用户在保存对话框里选中已有
// 文件就是要覆盖它——直接删掉再写的话，一旦写失败，用户的旧文件也没了。
func ExportTo(db *gorm.DB, dst string) error {
	tmp := dst + ".tmp"
	_ = os.Remove(tmp)
	if err := db.Exec("VACUUM INTO ?", tmp).Error; err != nil {
		return err
	}
	if err := os.Rename(tmp, dst); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// StageRestore 校验 src 是一个可用的 PostPigeon 数据库，并把它暂存为待恢复文件。
// 真正的替换发生在下次启动时的 ApplyPendingRestore。
func StageRestore(dbPath, src string) error {
	pending := dbPath + pendingRestoreSuffix
	removeDBFiles(pending)

	if err := copyFile(src, pending); err != nil {
		return fmt.Errorf("复制备份失败: %w", err)
	}
	if err := verifyDatabase(pending); err != nil {
		removeDBFiles(pending)
		return err
	}
	slog.Info("已暂存待恢复的数据库", "source", src)
	return nil
}

// PendingRestore 返回待恢复文件的路径，不存在时返回空串。
func PendingRestore(dbPath string) string {
	pending := dbPath + pendingRestoreSuffix
	if fileExists(pending) {
		return pending
	}
	return ""
}

// CancelPendingRestore 撤销一次已暂存但尚未生效的恢复。
func CancelPendingRestore(dbPath string) {
	removeDBFiles(dbPath + pendingRestoreSuffix)
}

// ApplyPendingRestore 在打开数据库之前把待恢复文件换上，返回是否发生了恢复。
//
// 必须在任何连接建立之前调用：替换的是数据库文件本身，连着的连接会看到一个
// 「被抽走」的文件。当前库不会被丢弃，而是改名成一份备份，让恢复本身也可撤销。
func ApplyPendingRestore(dbPath string) (bool, error) {
	pending := dbPath + pendingRestoreSuffix
	if !fileExists(pending) {
		return false, nil
	}

	if fileExists(dbPath) {
		keep := filepath.Join(filepath.Dir(dbPath),
			fmt.Sprintf("%s%s%s-restore", filepath.Base(dbPath), backupSuffix, time.Now().Format("20060102T150405")))
		// 连 -wal / -shm 一起改名：只搬主文件的话，尚未 checkpoint 的事务会被留在原地，
		// 保留下来的这份「恢复前现场」就是残缺的
		for _, suffix := range []string{"", "-wal", "-shm"} {
			if !fileExists(dbPath + suffix) {
				continue
			}
			if err := os.Rename(dbPath+suffix, keep+suffix); err != nil {
				return false, fmt.Errorf("保留恢复前的数据库失败: %w", err)
			}
		}
		slog.Info("恢复前的数据库已保留为备份", "backup", keep)
	}

	if err := os.Rename(pending, dbPath); err != nil {
		return false, fmt.Errorf("应用待恢复的数据库失败: %w", err)
	}
	// 待恢复文件是完整的库，它的 -wal / -shm 是校验时产生的残留，直接丢掉
	for _, suffix := range []string{"-wal", "-shm"} {
		_ = os.Remove(pending + suffix)
	}

	slog.Info("已从备份恢复数据库")
	pruneBackups(dbPath)
	return true, nil
}

// verifyDatabase 确认文件是一个结构完整、且确实属于本应用的 SQLite 数据库。
func verifyDatabase(path string) error {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		return fmt.Errorf("无法打开备份文件: %w", err)
	}
	defer func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	var result string
	if err := db.Raw("PRAGMA quick_check").Scan(&result).Error; err != nil {
		return fmt.Errorf("备份文件不是可用的数据库: %w", err)
	}
	if result != "ok" {
		return fmt.Errorf("备份文件已损坏: %s", result)
	}
	if !tableExists(db, "projects") || !tableExists(db, "goose_db_version") {
		return fmt.Errorf("这不是 PostPigeon 的数据库备份")
	}
	return nil
}

// copyFile 复制文件内容。
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		_ = os.Remove(dst)
		return err
	}
	return out.Close()
}

// removeDBFiles 删除一个数据库文件及其 WAL 附属文件。
func removeDBFiles(path string) {
	for _, suffix := range []string{"", "-wal", "-shm"} {
		_ = os.Remove(path + suffix)
	}
}
