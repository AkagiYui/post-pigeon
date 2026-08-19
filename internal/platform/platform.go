// Package platform 提供跨平台工具函数
package platform

import (
	"os"
	"slices"
	"strings"
)

// ResetWindowStateEnv 是跳过窗口状态恢复的环境变量名。
const ResetWindowStateEnv = "POSTPIGEON_RESET_WINDOW"

// ResetWindowStateFlag 是跳过窗口状态恢复的命令行参数。
const ResetWindowStateFlag = "--reset-window"

// IsShiftKeyPressed 检测启动时 Shift 键是否被按住。
//
// Linux 上恒为 false：X11 的 XQueryKeymap 需要链接 libX11，且在 Wayland
// 会话下根本查不到全局按键状态。那里请改用 ShouldResetWindowState 支持的
// 环境变量或命令行参数。
func IsShiftKeyPressed() bool {
	return isShiftKeyPressed()
}

// ShouldResetWindowState 判断本次启动是否应跳过窗口状态恢复，回到默认大小与位置。
//
// 三种触发方式，任一满足即可：
//   - 启动时按住 Shift（macOS / Windows）
//   - 设置环境变量 POSTPIGEON_RESET_WINDOW=1
//   - 带上命令行参数 --reset-window
//
// 后两者与桌面环境无关，是 Linux（尤其是 Wayland）下唯一可靠的入口，
// 也便于在脚本或快捷方式里固定使用。
func ShouldResetWindowState() bool {
	if isShiftKeyPressed() {
		return true
	}
	if isTruthy(os.Getenv(ResetWindowStateEnv)) {
		return true
	}
	return slices.Contains(os.Args[1:], ResetWindowStateFlag)
}

// isTruthy 判断环境变量是否表示「开启」。空字符串与 0/false/no/off 视为关闭。
func isTruthy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "0", "false", "no", "off":
		return false
	default:
		return true
	}
}

// DefaultWindowWidth 默认窗口宽度
const DefaultWindowWidth = 1280

// DefaultWindowHeight 默认窗口高度
const DefaultWindowHeight = 720
