// Package instancelock 用一把文件锁保证同一份数据目录同时只被一个进程使用。
package instancelock

import (
	"fmt"
	"os"
	"path/filepath"
)

// lockFileName 是数据目录下的锁文件名。
const lockFileName = "instance.lock"

// ErrAlreadyRunning 表示已有另一个实例占用着这份数据目录。
var ErrAlreadyRunning = fmt.Errorf("已有另一个实例在运行")

// Lock 是持有中的实例锁，进程退出时由操作系统自动释放。
type Lock struct {
	file *os.File
}

// Acquire 尝试锁住数据目录，成功返回锁对象，已被占用时返回 ErrAlreadyRunning。
//
// 必须在碰数据库之前调用：两个实例操作同一个 SQLite 文件时，WAL 与
// busy_timeout 会让它「看起来能用」，实际是设置、窗口状态、Cookie 互相覆盖，
// 后关闭的那个赢；升级时更糟——两个进程会各自跑一遍迁移和迁移前备份。
//
// 用文件锁而不是「写 PID 文件再判断进程是否存活」：崩溃或被强杀时锁由内核释放，
// 不会留下需要人工清理的僵尸锁，也没有 PID 复用的误判。
func Acquire(dataDir string) (*Lock, error) {
	path := filepath.Join(dataDir, lockFileName)
	file, err := acquire(path)
	if err != nil {
		return nil, err
	}
	return &Lock{file: file}, nil
}

// Release 主动释放锁。正常退出时调用；进程异常退出时由操作系统兜底。
func (l *Lock) Release() error {
	if l == nil || l.file == nil {
		return nil
	}
	err := l.file.Close()
	l.file = nil
	return err
}
