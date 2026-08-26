package services

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/config"
	"PostPigeon/internal/database"
	"PostPigeon/internal/platform"

	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"
)

// DataService 负责数据本身的维护：体积、压缩等。
//
// 无服务端应用没有运维入口，用户对「我的数据有多大、放在哪、怎么拿回来」是没有
// 手段的。这些操作只能由应用自己暴露出来。
type DataService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewDataService 创建数据维护服务实例。
func NewDataService(db *gorm.DB, cfg *config.Config) *DataService {
	return &DataService{db: db, cfg: cfg}
}

// DatabaseInfo 数据库的体积概况。
type DatabaseInfo struct {
	// Path 数据库文件路径
	Path string `json:"path"`
	// DataDir 数据目录
	DataDir string `json:"dataDir"`
	// SizeBytes 磁盘占用（主库 + WAL），即用户在文件管理器里看到的大小
	SizeBytes int64 `json:"sizeBytes"`
	// ReclaimableBytes 压缩后预计能回收的字节数（空闲页 × 页大小）
	ReclaimableBytes int64 `json:"reclaimableBytes"`
}

// GetDatabaseInfo 返回数据库体积概况。
func (s *DataService) GetDatabaseInfo() (DatabaseInfo, error) {
	info := DatabaseInfo{Path: s.cfg.DBPath, DataDir: s.cfg.DataDir}
	info.SizeBytes = dbFilesSize(s.cfg.DBPath)

	// SQLite 删除数据后页会进入 freelist 而不还给文件系统，文件因此只涨不落。
	// 这里把「压缩能拿回多少」直接算给用户看，否则「我清了历史怎么没变小」无从解释。
	var pageSize, freeCount int64
	if err := s.db.Raw("PRAGMA page_size").Scan(&pageSize).Error; err != nil {
		return info, apperr.Wrap(err, apperr.CodeDataStats)
	}
	if err := s.db.Raw("PRAGMA freelist_count").Scan(&freeCount).Error; err != nil {
		return info, apperr.Wrap(err, apperr.CodeDataStats)
	}
	info.ReclaimableBytes = pageSize * freeCount
	return info, nil
}

// CompactDatabase 压缩数据库（VACUUM）并把 WAL 截断，返回压缩后的体积概况。
//
// 历史清理、删项目这些操作都只是 DELETE，页进 freelist 但文件不缩，用久了就是
// 「我明明清空了历史，库还是几百 MB」。VACUUM 是唯一能把空间还给文件系统的手段，
// 但它要重写整个库、期间占用双倍磁盘，所以做成用户主动触发而不是自动执行。
func (s *DataService) CompactDatabase() (DatabaseInfo, error) {
	before := dbFilesSize(s.cfg.DBPath)

	// VACUUM 不能在事务里跑，这里走的是连接池的自动提交模式
	if err := s.db.Exec("VACUUM").Error; err != nil {
		return DatabaseInfo{}, apperr.Wrap(err, apperr.CodeDataCompact)
	}
	// WAL 模式下 VACUUM 的写入会先落在 WAL 里，不 checkpoint 的话磁盘占用不会立刻下降
	if err := s.db.Exec("PRAGMA wal_checkpoint(TRUNCATE)").Error; err != nil {
		// 只是没能立刻回收 WAL，库本身已经压缩过了，不算失败
		slog.Warn("压缩后截断 WAL 失败", "error", err)
	}

	info, err := s.GetDatabaseInfo()
	if err != nil {
		return info, err
	}
	slog.Info("数据库已压缩", "beforeBytes", before, "afterBytes", info.SizeBytes)
	return info, nil
}

// dbFilesSize 统计数据库在磁盘上的实际占用：主库 + WAL（-shm 是固定的几十 KB，忽略）。
func dbFilesSize(dbPath string) int64 {
	var total int64
	for _, path := range []string{dbPath, dbPath + "-wal"} {
		if stat, err := os.Stat(path); err == nil {
			total += stat.Size()
		}
	}
	return total
}

// OpenDataDir 用系统文件管理器打开数据目录。
//
// 用户的全部数据都在这个目录里（数据库、自动备份、日志），却没有任何入口能找到它。
func (s *DataService) OpenDataDir() error {
	if err := platform.OpenPath(s.cfg.DataDir); err != nil {
		return apperr.Wrap(err, apperr.CodeDataOpenDir)
	}
	return nil
}

// ExportData 让用户选一个位置，把整个数据库导出过去；用户取消时返回空串。
//
// 走原生保存对话框而不是「后端返回字节、前端下载」：库可以有几百 MB，
// 没必要在 JS 桥上搬一遍。
func (s *DataService) ExportData() (string, error) {
	dst, err := application.Get().Dialog.SaveFile().
		SetFilename(fmt.Sprintf("PostPigeon-%s.db", time.Now().Format("20060102"))).
		AddFilter("PostPigeon 数据库", "*.db").
		CanCreateDirectories(true).
		PromptForSingleSelection()
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeDataExport)
	}
	if dst == "" {
		return "", nil // 用户取消
	}
	if err := s.exportTo(dst); err != nil {
		return "", err
	}
	return dst, nil
}

// exportTo 把当前库导出到指定路径。
func (s *DataService) exportTo(dst string) error {
	if err := database.ExportTo(s.db, dst); err != nil {
		return apperr.Wrap(err, apperr.CodeDataExport)
	}
	slog.Info("已导出数据库", "path", dst)
	return nil
}

// ListBackups 列出数据目录里的备份，按时间从新到旧。
func (s *DataService) ListBackups() ([]database.BackupFile, error) {
	backups, err := database.ListBackups(s.cfg.DBPath)
	if err != nil {
		return nil, apperr.Wrap(err, apperr.CodeDataStats)
	}
	return backups, nil
}

// RestoreBackup 从指定文件恢复数据库。校验当场做，替换在下次启动时发生。
func (s *DataService) RestoreBackup(path string) error {
	if path == "" {
		return apperr.New(apperr.CodeInvalidInput)
	}
	if err := database.StageRestore(s.cfg.DBPath, path); err != nil {
		return apperr.Wrap(err, apperr.CodeDataRestore)
	}
	return nil
}

// PickBackupFile 让用户选一个备份文件并暂存恢复；用户取消时返回空串。
func (s *DataService) PickBackupFile() (string, error) {
	src, err := application.Get().Dialog.OpenFile().
		AddFilter("PostPigeon 数据库", "*.db").
		PromptForSingleSelection()
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeDataRestore)
	}
	if src == "" {
		return "", nil // 用户取消
	}
	if err := s.RestoreBackup(src); err != nil {
		return "", err
	}
	return src, nil
}

// GetPendingRestore 返回已暂存、等下次启动生效的恢复文件路径；没有时返回空串。
func (s *DataService) GetPendingRestore() string {
	return database.PendingRestore(s.cfg.DBPath)
}

// CancelRestore 撤销一次已暂存但尚未生效的恢复。
func (s *DataService) CancelRestore() {
	database.CancelPendingRestore(s.cfg.DBPath)
}

// QuitApp 退出应用，供「恢复已就绪，重启后生效」这类流程使用。
func (s *DataService) QuitApp() {
	application.Get().Quit()
}
