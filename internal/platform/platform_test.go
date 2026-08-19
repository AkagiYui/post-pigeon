package platform

import (
	"os"
	"testing"
)

func TestIsTruthy(t *testing.T) {
	falsy := []string{"", "0", "false", "FALSE", "no", "off", "  ", " off "}
	for _, value := range falsy {
		if isTruthy(value) {
			t.Errorf("%q 应视为关闭", value)
		}
	}
	truthy := []string{"1", "true", "TRUE", "yes", "on", "anything"}
	for _, value := range truthy {
		if !isTruthy(value) {
			t.Errorf("%q 应视为开启", value)
		}
	}
}

func TestShouldResetWindowStateByEnv(t *testing.T) {
	t.Setenv(ResetWindowStateEnv, "1")
	if !ShouldResetWindowState() {
		t.Errorf("设置环境变量后应请求重置窗口状态")
	}

	t.Setenv(ResetWindowStateEnv, "0")
	if ShouldResetWindowState() && !IsShiftKeyPressed() {
		t.Errorf("环境变量为 0 且未按 Shift 时不应重置")
	}
}

func TestShouldResetWindowStateByFlag(t *testing.T) {
	original := os.Args
	t.Cleanup(func() { os.Args = original })

	os.Args = []string{"postpigeon", ResetWindowStateFlag}
	if !ShouldResetWindowState() {
		t.Errorf("带上 %s 参数时应请求重置窗口状态", ResetWindowStateFlag)
	}

	// 程序名本身恰好等于该参数时不应误判（只看 os.Args[1:]）
	os.Args = []string{ResetWindowStateFlag}
	if ShouldResetWindowState() && !IsShiftKeyPressed() {
		t.Errorf("只有程序名匹配时不应触发重置")
	}
}

func TestDefaultWindowSize(t *testing.T) {
	if DefaultWindowWidth <= 0 || DefaultWindowHeight <= 0 {
		t.Fatalf("默认窗口尺寸必须为正数：%dx%d", DefaultWindowWidth, DefaultWindowHeight)
	}
}
