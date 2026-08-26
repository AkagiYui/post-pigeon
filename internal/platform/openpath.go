package platform

import (
	"fmt"
	"os/exec"
	"runtime"
)

// OpenPath 用系统的文件管理器打开一个目录（或选中一个文件）。
//
// 无服务端应用的数据全在本机的一个目录里，用户却没有任何入口能找到它——
// 备份在哪、库有多大、怎么拷走，都得先能打开这个目录。
func OpenPath(path string) error {
	cmd := openPathCommand(path)
	if cmd == nil {
		return fmt.Errorf("当前平台没有可用的文件管理器命令")
	}
	return cmd.Run()
}

// openPathCommand 返回当前平台上打开路径的命令；没有可用工具时返回 nil。
// 路径一律作为独立参数传递，不拼命令行。
func openPathCommand(path string) *exec.Cmd {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", path)
	case "windows":
		return exec.Command("explorer", path)
	default:
		if p, err := exec.LookPath("xdg-open"); err == nil {
			return exec.Command(p, path)
		}
		return nil
	}
}
