package platform

import (
	"context"
	"runtime"
	"slices"
	"strings"
	"testing"
)

// TestDialogCommandCarriesText 对话框命令必须把文案原样带上，且不经过 shell 拼接
// （文案里的引号、反斜杠、换行都不该需要转义）。
func TestDialogCommandCarriesText(t *testing.T) {
	const title = `标题 "带引号"`
	const message = "第一行\n第二行 \\ 'single' \"double\" $(whoami)"

	cmd := dialogCommand(context.Background(), dialogError, title, message)
	if cmd == nil {
		if runtime.GOOS == "darwin" || runtime.GOOS == "windows" {
			t.Fatalf("%s 上应始终有可用的对话框命令", runtime.GOOS)
		}
		t.Skip("当前环境没有可用的对话框工具")
	}

	// 不能是走 shell 的命令（sh -c 之类），否则文案就成了命令行的一部分
	if base := strings.ToLower(cmd.Args[0]); strings.HasSuffix(base, "sh") || strings.HasSuffix(base, "cmd.exe") {
		t.Fatalf("对话框不应经过 shell 执行: %v", cmd.Args)
	}

	carried := slices.Contains(cmd.Args, message) && slices.Contains(cmd.Args, title)
	if !carried {
		// Windows 上文案走环境变量
		var gotMessage, gotTitle bool
		for _, kv := range cmd.Env {
			gotMessage = gotMessage || kv == "POSTPIGEON_DIALOG_MESSAGE="+message
			gotTitle = gotTitle || kv == "POSTPIGEON_DIALOG_TITLE="+title
		}
		carried = gotMessage && gotTitle
	}
	if !carried {
		t.Fatalf("命令既没在参数里也没在环境变量里带上原文: args=%v", cmd.Args)
	}
}

// TestDialogCommandHasTimeout 命令必须挂在带超时的 context 上，
// 免得无人值守时被一个弹窗永远挂住。
func TestDialogCommandHasTimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cmd := dialogCommand(ctx, dialogInfo, "t", "m")
	if cmd == nil {
		t.Skip("当前环境没有可用的对话框工具")
	}
	cancel()
	if err := cmd.Start(); err == nil {
		_ = cmd.Wait()
		t.Fatal("context 已取消，命令不应还能启动")
	}
}
