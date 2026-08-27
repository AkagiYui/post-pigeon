// Package safego 提供带 panic 兜底的 goroutine 启动方式。
package safego

import (
	"log/slog"
	"runtime/debug"
)

// Go 启动一个 goroutine，panic 时记录日志而不是杀掉整个进程。
//
// 为什么需要它：Wails 会接住 service 方法里的 panic（转成前端的调用错误），但那层
// 保护只覆盖被前端调用的方法。我们自己 `go func()` 起的协程不在其中——里面 panic
// 会直接终止进程，用户看到的就是「用着用着突然没了」。
//
// name 会写进日志，用来分辨是哪条协程出的事。
func Go(name string, fn func()) {
	go Run(name, fn)
}

// Run 在当前 goroutine 里执行 fn 并兜住 panic，供已经自己起了协程的调用方使用。
func Run(name string, fn func()) {
	defer Recover(name)
	fn()
}

// Recover 在 defer 里调用，兜住当前 goroutine 的 panic 并记录堆栈。
//
// 吞掉 panic 是有意的：这些协程都是后台任务（推流、定时检查、脚本发请求），
// 一条出问题不该连累整个应用。堆栈进日志，诊断信息导出时能带出去。
func Recover(name string) {
	if r := recover(); r != nil {
		slog.Error("后台协程发生 panic",
			"goroutine", name,
			"panic", r,
			"stack", string(debug.Stack()),
		)
	}
}
