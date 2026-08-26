//go:build !windows

package instancelock

import (
	"os"
	"syscall"
)

// acquire 用 flock 加非阻塞独占锁。锁挂在打开的文件描述符上，
// 进程无论正常退出还是被杀，内核都会释放它。
func acquire(path string) (*os.File, error) {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}
	if err := syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		file.Close()
		if err == syscall.EWOULDBLOCK {
			return nil, ErrAlreadyRunning
		}
		return nil, err
	}
	return file, nil
}
