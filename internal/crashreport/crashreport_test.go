package crashreport

import (
	"os"
	"path/filepath"
	"testing"
)

// TestMarkDetectsUncleanExit 正常退出会清掉标记；标记还在就说明上次是崩的。
func TestMarkDetectsUncleanExit(t *testing.T) {
	dir := t.TempDir()

	crashed, err := Mark(dir)
	if err != nil {
		t.Fatalf("首次标记失败: %v", err)
	}
	if crashed {
		t.Fatal("第一次运行不应判定为崩溃")
	}

	// 不调用 Clear 直接再来一次，等价于上次进程没能正常退出
	crashed, err = Mark(dir)
	if err != nil {
		t.Fatalf("标记失败: %v", err)
	}
	if !crashed {
		t.Fatal("上次没有正常退出，应判定为崩溃")
	}

	if err := Clear(dir); err != nil {
		t.Fatalf("清除标记失败: %v", err)
	}
	crashed, err = Mark(dir)
	if err != nil {
		t.Fatalf("标记失败: %v", err)
	}
	if crashed {
		t.Fatal("上次已正常退出，不应判定为崩溃")
	}
}

// TestClearIsIdempotent 标记不存在时清除不应报错。
func TestClearIsIdempotent(t *testing.T) {
	dir := t.TempDir()
	if err := Clear(dir); err != nil {
		t.Fatalf("清除不存在的标记不应报错: %v", err)
	}
}

// TestMarkWritesPid 标记里应写着当前进程的 PID，便于和日志对上。
func TestMarkWritesPid(t *testing.T) {
	dir := t.TempDir()
	if _, err := Mark(dir); err != nil {
		t.Fatalf("标记失败: %v", err)
	}
	content, err := os.ReadFile(filepath.Join(dir, markerName))
	if err != nil {
		t.Fatalf("读取标记失败: %v", err)
	}
	if want := pidLine(); string(content) != want {
		t.Fatalf("标记内容 = %q，期望 %q", content, want)
	}
}
