//go:build linux

package platform

// isShiftKeyPressed 在 Linux 上检测 Shift 键是否被按住
// 默认返回 false，Linux 上通过 X11 检测较为复杂，暂时不实现
// TODO: 使用 X11 的 XQueryKeymap 实现 Shift 键检测
func isShiftKeyPressed() bool {
	return false
}
