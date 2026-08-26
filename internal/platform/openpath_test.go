package platform

import (
	"runtime"
	"slices"
	"testing"
)

// TestOpenPathCommandCarriesPath 路径必须作为独立参数传递，不能拼进命令行。
func TestOpenPathCommandCarriesPath(t *testing.T) {
	const path = "/tmp/带空格 和'引号\"的目录"

	cmd := openPathCommand(path)
	if cmd == nil {
		if runtime.GOOS == "darwin" || runtime.GOOS == "windows" {
			t.Fatalf("%s 上应始终有可用的命令", runtime.GOOS)
		}
		t.Skip("当前环境没有 xdg-open")
	}
	if !slices.Contains(cmd.Args, path) {
		t.Fatalf("命令没有原样带上路径: %v", cmd.Args)
	}
	if len(cmd.Args) != 2 {
		t.Fatalf("不应有多余参数: %v", cmd.Args)
	}
}
