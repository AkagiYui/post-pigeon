package platform

import (
	"context"
	"os/exec"
	"runtime"
	"time"
)

// dialogTimeout 是对话框的最长存活时间。没人点掉的话（比如开机自启、无人值守的
// 环境），进程不该被一个弹窗永远挂住。
const dialogTimeout = 2 * time.Minute

// ShowErrorDialog 弹一个原生错误对话框，阻塞到用户点掉或超时。
//
// 为什么不用 Wails 自带的 application.ErrorDialog：它内部走 InvokeSync →
// globalApplication.dispatchOnMainThread，而 globalApplication 要到
// application.New 之后才存在。启动阶段（配置 / 日志 / 数据库初始化）失败时应用还
// 没创建，调过去必然空指针。这里退回到各平台自带的命令行对话框，不依赖主循环。
//
// 参数一律经 argv 或环境变量传给子进程，不拼 shell 命令行，省掉转义问题。
//
// 弹不出来就静默放弃（没有 GUI 会话、Linux 上没装 zenity/kdialog 等）：这只是尽力
// 而为的提示，错误本身始终会写进日志和 stderr。
func ShowErrorDialog(title, message string) {
	ctx, cancel := context.WithTimeout(context.Background(), dialogTimeout)
	defer cancel()

	cmd := errorDialogCommand(ctx, title, message)
	if cmd == nil {
		return
	}
	_ = cmd.Run()
}

// errorDialogCommand 返回当前平台上用于弹错误框的命令；没有可用工具时返回 nil。
func errorDialogCommand(ctx context.Context, title, message string) *exec.Cmd {
	switch runtime.GOOS {
	case "darwin":
		// 用 `on run argv` 把文案作为参数传进去，避免拼进 AppleScript 字符串字面量后
		// 还要处理引号与反斜杠的转义。
		return exec.CommandContext(ctx, "osascript",
			"-e", "on run argv",
			"-e", `display dialog (item 1 of argv) with title (item 2 of argv) with icon stop buttons {"好"} default button 1`,
			"-e", "end run",
			"--", message, title)

	case "windows":
		// 文案走环境变量，PowerShell 单引号转义（'' ）就不必操心了。
		// -WindowStyle Hidden 是为了不闪出一个控制台窗口。
		cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive",
			"-WindowStyle", "Hidden", "-Command",
			"Add-Type -AssemblyName PresentationFramework;"+
				"[void][System.Windows.MessageBox]::Show($env:POSTPIGEON_DIALOG_MESSAGE,"+
				"$env:POSTPIGEON_DIALOG_TITLE,'OK','Error')")
		cmd.Env = append(cmd.Environ(),
			"POSTPIGEON_DIALOG_MESSAGE="+message,
			"POSTPIGEON_DIALOG_TITLE="+title)
		return cmd

	default:
		// Linux/BSD：桌面环境自带哪个就用哪个，都没有就放弃。
		if path, err := exec.LookPath("zenity"); err == nil {
			return exec.CommandContext(ctx, path, "--error", "--title", title, "--text", message)
		}
		if path, err := exec.LookPath("kdialog"); err == nil {
			return exec.CommandContext(ctx, path, "--title", title, "--error", message)
		}
		if path, err := exec.LookPath("notify-send"); err == nil {
			return exec.CommandContext(ctx, path, "--urgency=critical", title, message)
		}
		return nil
	}
}
