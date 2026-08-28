package services

import (
	"archive/zip"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
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
	// lastRunCrashed 上次是否异常退出，由启动时的运行标记判定
	lastRunCrashed bool
}

// diagnosticsLogCount 诊断包里附带的日志文件份数（按天切分，取最近几天）。
const diagnosticsLogCount = 3

// NewDataService 创建数据维护服务实例。
func NewDataService(db *gorm.DB, cfg *config.Config, lastRunCrashed bool) *DataService {
	return &DataService{db: db, cfg: cfg, lastRunCrashed: lastRunCrashed}
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
	info := DatabaseInfo{
		Path:      s.cfg.DBPath,
		DataDir:   s.cfg.DataDir,
		SizeBytes: dbFilesSize(s.cfg.DBPath),
	}

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

// GetLastRunCrashed 返回上次是否异常退出，供界面提示用户导出诊断信息。
func (s *DataService) GetLastRunCrashed() bool {
	return s.lastRunCrashed
}

// ExportDiagnostics 让用户选个位置，导出一份诊断信息压缩包；取消时返回空串。
//
// 无服务端应用出问题时你什么也看不到，只能靠用户描述。这个包让「反馈问题」这件事
// 从「它有时候会崩」变成一份可读的现场：版本、平台、数据库体积、最近的日志。
//
// 刻意不含数据库本身：库里有明文的 token 与密码，不该因为反馈一个 bug 就被带出去。
func (s *DataService) ExportDiagnostics() (string, error) {
	dst, err := application.Get().Dialog.SaveFile().
		SetFilename(fmt.Sprintf("PostPigeon-诊断-%s.zip", time.Now().Format("20060102-150405"))).
		AddFilter("压缩包", "*.zip").
		CanCreateDirectories(true).
		PromptForSingleSelection()
	if err != nil {
		return "", apperr.Wrap(err, apperr.CodeDataExport)
	}
	if dst == "" {
		return "", nil // 用户取消
	}
	if err := s.writeDiagnostics(dst); err != nil {
		return "", apperr.Wrap(err, apperr.CodeDataExport)
	}
	slog.Info("已导出诊断信息", "path", dst)
	return dst, nil
}

// writeDiagnostics 把诊断信息写成 zip。先写 .tmp 再改名，覆盖失败不至于毁掉原文件。
func (s *DataService) writeDiagnostics(dst string) error {
	tmp := dst + ".tmp"
	file, err := os.Create(tmp)
	if err != nil {
		return err
	}
	zw := zip.NewWriter(file)

	fail := func(err error) error {
		_ = zw.Close()
		_ = file.Close()
		_ = os.Remove(tmp)
		return err
	}

	summary, err := zw.Create("summary.txt")
	if err != nil {
		return fail(err)
	}
	if _, err := summary.Write([]byte(s.diagnosticsSummary())); err != nil {
		return fail(err)
	}

	for _, name := range recentLogFiles(s.cfg.LogsDir, diagnosticsLogCount) {
		content, err := os.ReadFile(filepath.Join(s.cfg.LogsDir, name))
		if err != nil {
			continue // 少一份日志不该让整个导出失败
		}
		entry, err := zw.Create("logs/" + name)
		if err != nil {
			return fail(err)
		}
		if _, err := entry.Write(content); err != nil {
			return fail(err)
		}
	}

	if err := zw.Close(); err != nil {
		return fail(err)
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, dst); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// diagnosticsSummary 汇总一份纯文本的运行现场。
func (s *DataService) diagnosticsSummary() string {
	var b strings.Builder
	fmt.Fprintf(&b, "PostPigeon 诊断信息\n")
	fmt.Fprintf(&b, "导出时间: %s\n\n", time.Now().Format(time.RFC3339))

	fmt.Fprintf(&b, "版本:     %s\n", config.Version)
	fmt.Fprintf(&b, "构建哈希: %s\n", config.BuildHash)
	fmt.Fprintf(&b, "构建时间: %s\n", config.BuildTime)
	fmt.Fprintf(&b, "平台:     %s/%s\n", runtime.GOOS, runtime.GOARCH)
	fmt.Fprintf(&b, "Go:       %s\n\n", runtime.Version())

	fmt.Fprintf(&b, "数据目录: %s\n", s.cfg.DataDir)
	fmt.Fprintf(&b, "上次退出: %s\n\n", crashedText(s.lastRunCrashed))

	if info, err := s.GetDatabaseInfo(); err == nil {
		fmt.Fprintf(&b, "数据库大小:   %d 字节\n", info.SizeBytes)
		fmt.Fprintf(&b, "可回收空间:   %d 字节\n\n", info.ReclaimableBytes)
	}

	if backups, err := database.ListBackups(s.cfg.DBPath); err == nil {
		fmt.Fprintf(&b, "备份（%d 份）:\n", len(backups))
		for _, backup := range backups {
			fmt.Fprintf(&b, "  %s  %d 字节  %s\n",
				backup.Name, backup.SizeBytes, backup.CreatedAt.Format(time.RFC3339))
		}
		b.WriteString("\n")
	}

	b.WriteString("说明：本压缩包只含上面这份摘要与最近的日志，不含数据库文件——\n")
	b.WriteString("库里有明文的 token 与密码，不应该因为反馈一个问题就被带出去。\n")
	return b.String()
}

// crashedText 把「上次是否异常退出」翻译成摘要里的一句话。
func crashedText(crashed bool) string {
	if crashed {
		return "异常退出（未走正常关闭流程）"
	}
	return "正常"
}

// recentLogFiles 返回日志目录里最近的若干个日志文件名（文件名以日期结尾，字典序即时间序）。
func recentLogFiles(logsDir string, limit int) []string {
	entries, err := os.ReadDir(logsDir)
	if err != nil {
		return nil
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "postpigeon-") && strings.HasSuffix(e.Name(), ".log") {
			names = append(names, e.Name())
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(names)))
	if len(names) > limit {
		names = names[:limit]
	}
	return names
}
