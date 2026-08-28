package logger

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestRotatesOnSizeLimit 超过大小上限时应滚动出带序号的分片，当前文件名保持不变。
func TestRotatesOnSizeLimit(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "postpigeon-2026-08-27.log")

	file, err := openLogFile(path, 100)
	if err != nil {
		t.Fatalf("打开日志失败: %v", err)
	}
	defer file.Close()

	first := []byte(strings.Repeat("a", 80) + "\n")
	if _, err := file.Write(first); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	// 这一条会把总量顶过 100 字节，应先滚动
	second := []byte(strings.Repeat("b", 40) + "\n")
	if _, err := file.Write(second); err != nil {
		t.Fatalf("写入失败: %v", err)
	}

	if file.Name() != path {
		t.Fatalf("当前文件名应保持不带序号，实际 %s", file.Name())
	}

	rotated := filepath.Join(dir, "postpigeon-2026-08-27.1.log")
	rotatedContent, err := os.ReadFile(rotated)
	if err != nil {
		t.Fatalf("分片不存在: %v", err)
	}
	if !strings.HasPrefix(string(rotatedContent), "aaa") {
		t.Fatalf("先写的内容应留在分片里: %q", rotatedContent)
	}

	currentContent, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("当前文件不存在: %v", err)
	}
	if !strings.HasPrefix(string(currentContent), "bbb") {
		t.Fatalf("后写的内容应在当前文件里: %q", currentContent)
	}
}

// TestRotatesRepeatedly 连续超限应依次生成 .1 .2 .3，不会互相覆盖。
func TestRotatesRepeatedly(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "postpigeon-2026-08-27.log")

	file, err := openLogFile(path, 50)
	if err != nil {
		t.Fatalf("打开日志失败: %v", err)
	}
	defer file.Close()

	for range 4 {
		if _, err := file.Write([]byte(strings.Repeat("x", 40) + "\n")); err != nil {
			t.Fatalf("写入失败: %v", err)
		}
	}

	for i := 1; i <= 3; i++ {
		name := filepath.Join(dir, "postpigeon-2026-08-27."+string(rune('0'+i))+".log")
		if _, err := os.Stat(name); err != nil {
			t.Fatalf("缺少分片 %s: %v", name, err)
		}
	}
}

// TestSingleOversizedWriteDoesNotLoop 单条日志本身就超限时不应每写一条滚一次。
func TestSingleOversizedWriteDoesNotLoop(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "postpigeon-2026-08-27.log")

	file, err := openLogFile(path, 10)
	if err != nil {
		t.Fatalf("打开日志失败: %v", err)
	}
	defer file.Close()

	// 空文件上写一条超限的内容：不该滚动（滚了也没用，新文件照样超限）
	if _, err := file.Write([]byte(strings.Repeat("y", 100))); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "postpigeon-2026-08-27.1.log")); !os.IsNotExist(err) {
		t.Fatal("空文件上的单条超限写入不应触发滚动")
	}
}

// TestResumesSizeFromExistingFile 续写已有文件时要把已有大小算进来，
// 否则重启一次就等于把上限清零。
func TestResumesSizeFromExistingFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "postpigeon-2026-08-27.log")
	if err := os.WriteFile(path, []byte(strings.Repeat("z", 90)), 0o644); err != nil {
		t.Fatalf("预置日志失败: %v", err)
	}

	file, err := openLogFile(path, 100)
	if err != nil {
		t.Fatalf("打开日志失败: %v", err)
	}
	defer file.Close()

	if _, err := file.Write([]byte(strings.Repeat("w", 20))); err != nil {
		t.Fatalf("写入失败: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "postpigeon-2026-08-27.1.log")); err != nil {
		t.Fatalf("已有内容应计入大小并触发滚动: %v", err)
	}
}

// TestNextRotatedPath 分片命名应插在扩展名之前，并跳过已存在的序号。
func TestNextRotatedPath(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "postpigeon-2026-08-27.log")

	if got, want := nextRotatedPath(path), filepath.Join(dir, "postpigeon-2026-08-27.1.log"); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
	if err := os.WriteFile(filepath.Join(dir, "postpigeon-2026-08-27.1.log"), []byte("x"), 0o644); err != nil {
		t.Fatalf("造文件失败: %v", err)
	}
	if got, want := nextRotatedPath(path), filepath.Join(dir, "postpigeon-2026-08-27.2.log"); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
