package safego

import (
	"bytes"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"
)

// waitForLog 轮询等待日志里出现 want，超时即失败。
func waitForLog(t *testing.T, logs func() string, want string) string {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if out := logs(); strings.Contains(out, want) {
			return out
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("等不到含 %q 的日志，实际: %s", want, logs())
	return ""
}

// captureLogs 把默认日志接到内存里，返回读取函数。
func captureLogs(t *testing.T) func() string {
	t.Helper()
	var mu sync.Mutex
	var buf bytes.Buffer
	original := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&syncWriter{mu: &mu, buf: &buf}, nil)))
	t.Cleanup(func() { slog.SetDefault(original) })
	return func() string {
		mu.Lock()
		defer mu.Unlock()
		return buf.String()
	}
}

type syncWriter struct {
	mu  *sync.Mutex
	buf *bytes.Buffer
}

func (w *syncWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.buf.Write(p)
}

// TestGoSurvivesPanic 协程里 panic 不该带走整个进程，且要留下可查的日志。
func TestGoSurvivesPanic(t *testing.T) {
	logs := captureLogs(t)

	Go("ws.readLoop", func() { panic("boom") })

	// Recover 在协程里异步执行，轮询等它把日志写出来
	out := waitForLog(t, logs, "ws.readLoop")
	if !strings.Contains(out, "ws.readLoop") {
		t.Fatalf("日志里应指出是哪条协程: %s", out)
	}
	if !strings.Contains(out, "boom") {
		t.Fatalf("日志里应带上 panic 值: %s", out)
	}
	if !strings.Contains(out, "stack") {
		t.Fatalf("日志里应带上堆栈: %s", out)
	}
}

// TestRunReturnsNormally 正常执行时不该有任何日志。
func TestRunReturnsNormally(t *testing.T) {
	logs := captureLogs(t)

	ran := false
	Run("normal", func() { ran = true })

	if !ran {
		t.Fatal("fn 没有被执行")
	}
	if logs() != "" {
		t.Fatalf("正常路径不该记日志: %s", logs())
	}
}

// TestRunRecoversPanic Run 同步兜底，调用方不受影响。
func TestRunRecoversPanic(t *testing.T) {
	captureLogs(t)

	finished := false
	func() {
		Run("sync", func() { panic("nope") })
		finished = true
	}()

	if !finished {
		t.Fatal("panic 应当被 Run 兜住，调用方要能继续往下走")
	}
}
