package logger

import (
	"bytes"
	"log/slog"
	"testing"
)

// TestForWailsWritesSomewhere 交给 Wails 的 logger 必须真的会写出去。
//
// 这条用例守的是一个只在正式包里现形的坑：Wails 自带的 DefaultLogger 在
// production 构建下写的是 io.Discard，被它接住的 service panic 会连堆栈一起蒸发。
// 谁把这里换回默认 logger（或任何丢弃型 handler），这条就会失败。
func TestForWailsWritesSomewhere(t *testing.T) {
	var buf bytes.Buffer
	original := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(original) })

	wailsLogger := ForWails()
	if wailsLogger == nil {
		t.Fatal("必须给 Wails 一个 logger，否则它会退回到 production 下丢弃一切的默认实现")
	}

	wailsLogger.Error("panic in bound method X: boom")
	if buf.Len() == 0 {
		t.Fatal("Wails 的日志没有落到应用的日志目的地")
	}
	if !bytes.Contains(buf.Bytes(), []byte("boom")) {
		t.Fatalf("日志内容不对: %s", buf.String())
	}
}
