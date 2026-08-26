//go:build windows

package instancelock

import (
	"os"

	"golang.org/x/sys/windows"
)

// acquire 在 Windows 上用「独占打开」代替 flock：dwShareMode 传 0，
// 第二个进程再打开同一个文件会拿到 ERROR_SHARING_VIOLATION。
// 句柄随进程结束由系统关闭，同样不会留下僵尸锁。
func acquire(path string) (*os.File, error) {
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}
	handle, err := windows.CreateFile(
		pathPtr,
		windows.GENERIC_READ|windows.GENERIC_WRITE,
		0, // 不共享：这就是「锁」本身
		nil,
		windows.OPEN_ALWAYS,
		windows.FILE_ATTRIBUTE_NORMAL,
		0,
	)
	if err != nil {
		if err == windows.ERROR_SHARING_VIOLATION || err == windows.ERROR_LOCK_VIOLATION {
			return nil, ErrAlreadyRunning
		}
		return nil, err
	}
	return os.NewFile(uintptr(handle), path), nil
}
