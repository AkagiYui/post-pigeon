package logger

import "log/slog"

// ForWails 返回交给 Wails 的 `application.Options.Logger`。
//
// 必须显式传：不传的话 Wails 用自己的 DefaultLogger，而它在 production 构建下是
// `slog.New(slog.NewTextHandler(io.Discard, nil))`——正式发布的包里，Wails 侧的
// 日志会被直接丢掉。
//
// 丢掉的不只是框架自己的告警。service 方法里的 panic 会被 Wails 的 BoundMethod.Call
// 接住并转成前端的调用错误（应用不会因此退出），panic 的信息与堆栈正是经由这个
// logger 输出的。也就是说：不传 Logger，用户遇到的就是「操作失败了一下」，
// 而日志里一个字都没有——这类被接住的 panic 恰恰是最常见的一种崩溃。
//
// 这里返回 slog.Default()，即 Setup 装好的那个 handler（同时写标准输出与日志文件）。
func ForWails() *slog.Logger {
	return slog.Default()
}
