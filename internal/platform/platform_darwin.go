//go:build darwin

package platform

/*
#import <Carbon/Carbon.h>
#import <ApplicationServices/ApplicationServices.h>
*/
import "C"

// isShiftKeyPressed 在 macOS 上检测 Shift 键是否被按住
// 使用 CoreGraphics 的 CGEventSourceFlagsState 获取当前修饰键状态
func isShiftKeyPressed() bool {
	flags := C.CGEventSourceFlagsState(C.kCGEventSourceStateHIDSystemState)
	return flags & C.kCGEventFlagMaskShift != 0
}
