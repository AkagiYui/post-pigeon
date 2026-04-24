//go:build windows

package platform

import (
	"syscall"
)

// Windows API 常量
const (
	vkShift = 0x10 // 虚拟键码：Shift
)

// isShiftKeyPressed 在 Windows 上检测 Shift 键是否被按住
// 使用 GetAsyncKeyState 获取键的当前状态
func isShiftKeyPressed() bool {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("GetAsyncKeyState")
	ret, _, _ := proc.Call(vkShift)
	// 高字节为 1 表示键当前被按下
	return ret&0x8000 != 0
}
