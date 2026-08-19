//go:build linux

package platform

// isShiftKeyPressed 在 Linux 上恒为 false。
//
// 唯一的纯 X11 方案 XQueryKeymap 需要在构建期链接 libX11（Wails 的 Linux
// 依赖里并不保证有它的开发包），而且在 Wayland 会话下拿不到全局按键状态——
// 出于安全设计，Wayland 不允许应用查询自己窗口之外的键盘状态。
// 与其提供一个「在半数发行版上静默失效」的实现，不如不实现：
// Linux 用户请改用 ShouldResetWindowState 支持的环境变量或命令行参数，
// 它们与桌面环境无关，且在 X11 / Wayland 下行为一致。
func isShiftKeyPressed() bool {
	return false
}
