package logger

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime/debug"
	"sync"
)

// maxLogFileBytes 单个日志文件的大小上限，超过就滚动到下一个分片。
//
// 按天切分挡不住「一天之内写爆」：集合运行器跑几千个请求、或者流式响应一直刷，
// 单日日志可以大到没法读、也没法附在反馈里。
const maxLogFileBytes = 8 << 20 // 8 MiB

// File 是应用的日志文件句柄：按大小滚动，对上层就是一个普通 io.Writer。
type File struct {
	mu       sync.Mutex
	path     string // 当前分片的路径（始终是当天那个不带序号的名字）
	maxBytes int64
	file     *os.File
	size     int64
}

// openLogFile 打开（或续写）当天的日志文件。
func openLogFile(path string, maxBytes int64) (*File, error) {
	f := &File{path: path, maxBytes: maxBytes}
	if err := f.open(); err != nil {
		return nil, err
	}
	return f, nil
}

// Name 返回当前正在写入的文件路径。
func (f *File) Name() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.path
}

// Write 写入日志，必要时先滚动。
func (f *File) Write(p []byte) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	// 单条日志本身就超限时不再滚动，否则每写一条都要滚一次
	if f.size > 0 && f.size+int64(len(p)) > f.maxBytes {
		if err := f.rotate(); err != nil {
			// 滚动失败就继续往原文件写：日志超限远好过日志丢失
			slog.Warn("日志滚动失败，继续写入当前文件", "error", err)
		}
	}

	n, err := f.file.Write(p)
	f.size += int64(n)
	return n, err
}

// Close 关闭当前文件。
func (f *File) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.file == nil {
		return nil
	}
	err := f.file.Close()
	f.file = nil
	return err
}

// open 以追加方式打开当前分片，并把崩溃输出指向它。
func (f *File) open() error {
	file, err := os.OpenFile(f.path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("无法打开日志文件: %w", err)
	}
	f.file = file

	f.size = 0
	if stat, err := file.Stat(); err == nil {
		f.size = stat.Size()
	}

	// 让 panic 与运行时 fatal 的堆栈也落进日志文件。Go 运行时默认只往 stderr 打，
	// 而双击启动的 GUI 应用没有 stderr 可看——崩溃于是彻底沉默。
	// 每次换文件都要重设，否则堆栈会写进已经滚走的旧分片。
	if err := debug.SetCrashOutput(file, debug.CrashOptions{}); err != nil {
		slog.Warn("设置崩溃输出失败", "error", err)
	}
	return nil
}

// rotate 把当前文件改名成带序号的分片，然后开一个新的当前文件。
//
// 改名而不是「换个新名字继续写」：当前分片的名字始终不带序号，
// 「最新的日志在哪」这件事对用户和诊断导出都不必再猜。
func (f *File) rotate() error {
	if err := f.file.Close(); err != nil {
		return err
	}
	if err := os.Rename(f.path, nextRotatedPath(f.path)); err != nil {
		// 改名失败时把原文件重新打开，避免句柄悬空
		_ = f.open()
		return err
	}
	return f.open()
}

// nextRotatedPath 返回下一个可用的分片路径：postpigeon-2026-08-27.log → …-2026-08-27.1.log
func nextRotatedPath(path string) string {
	ext := filepath.Ext(path)
	base := path[:len(path)-len(ext)]
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s.%d%s", base, i, ext)
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate
		}
	}
}
