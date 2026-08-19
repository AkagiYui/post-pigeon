//go:build darwin

package platform

/*
// 必须显式声明框架：主程序恰好由 Wails 带上了这些框架，但本包单独构建
// （例如 go test ./internal/platform/）时会因缺少 LDFLAGS 而链接失败。
#cgo LDFLAGS: -framework ApplicationServices
#import <ApplicationServices/ApplicationServices.h>
*/
import "C"

// isShiftKeyPressed 在 macOS 上检测 Shift 键是否被按住
// 使用 CoreGraphics 的 CGEventSourceFlagsState 获取当前修饰键状态
func isShiftKeyPressed() bool {
	flags := C.CGEventSourceFlagsState(C.kCGEventSourceStateHIDSystemState)
	return flags&C.kCGEventFlagMaskShift != 0
}
