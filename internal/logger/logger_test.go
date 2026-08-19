package logger

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"PostPigeon/internal/config"
)

// newTestConfig 造一个指向临时目录的配置。
func newTestConfig(t *testing.T) *config.Config {
	t.Helper()
	dir := t.TempDir()
	logs := filepath.Join(dir, "logs")
	if err := os.MkdirAll(logs, 0o755); err != nil {
		t.Fatalf("创建日志目录失败: %v", err)
	}
	return &config.Config{DataDir: dir, LogsDir: logs, DBPath: filepath.Join(dir, "test.db")}
}

func TestSetupCreatesDatedLogFile(t *testing.T) {
	cfg := newTestConfig(t)

	file, err := Setup(cfg)
	if err != nil {
		t.Fatalf("Setup err=%v", err)
	}
	t.Cleanup(func() { _ = file.Close() })

	expected := filepath.Join(cfg.LogsDir, "postpigeon-"+time.Now().Format("2006-01-02")+".log")
	if file.Name() != expected {
		t.Fatalf("日志文件名=%s，期望 %s", file.Name(), expected)
	}

	// Setup 自身会写一条初始化日志，文件应当非空
	content, err := os.ReadFile(expected)
	if err != nil {
		t.Fatalf("读取日志失败: %v", err)
	}
	if !strings.Contains(string(content), "日志系统初始化完成") {
		t.Errorf("日志内容=%q", string(content))
	}
}

func TestSetupAppendsToExistingFile(t *testing.T) {
	cfg := newTestConfig(t)
	path := filepath.Join(cfg.LogsDir, "postpigeon-"+time.Now().Format("2006-01-02")+".log")
	if err := os.WriteFile(path, []byte("previous run\n"), 0o644); err != nil {
		t.Fatalf("预置日志失败: %v", err)
	}

	file, err := Setup(cfg)
	if err != nil {
		t.Fatalf("Setup err=%v", err)
	}
	t.Cleanup(func() { _ = file.Close() })

	content, _ := os.ReadFile(path)
	if !strings.HasPrefix(string(content), "previous run") {
		t.Errorf("同一天的日志应追加而不是覆盖：%q", string(content))
	}
}

func TestCleanOldLogs(t *testing.T) {
	cfg := newTestConfig(t)

	old := filepath.Join(cfg.LogsDir, "postpigeon-2000-01-01.log")
	fresh := filepath.Join(cfg.LogsDir, "postpigeon-2999-01-01.log")
	unrelated := filepath.Join(cfg.LogsDir, "other.log")
	for _, path := range []string{old, fresh, unrelated} {
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("写入 %s 失败: %v", path, err)
		}
	}
	// 把旧日志的修改时间推到 60 天前
	stale := time.Now().AddDate(0, 0, -60)
	if err := os.Chtimes(old, stale, stale); err != nil {
		t.Fatalf("修改时间失败: %v", err)
	}
	// 无关文件也设为很旧，用来验证不会被误删
	if err := os.Chtimes(unrelated, stale, stale); err != nil {
		t.Fatalf("修改时间失败: %v", err)
	}

	cleanOldLogs(cfg.LogsDir)

	if _, err := os.Stat(old); !os.IsNotExist(err) {
		t.Errorf("超过 30 天的日志应被清理")
	}
	if _, err := os.Stat(fresh); err != nil {
		t.Errorf("未过期的日志不应被清理: %v", err)
	}
	if _, err := os.Stat(unrelated); err != nil {
		t.Errorf("非应用日志不应被清理: %v", err)
	}
}

func TestCleanOldLogsMissingDirectory(t *testing.T) {
	// 目录不存在时只应告警，不应 panic
	cleanOldLogs(filepath.Join(t.TempDir(), "does-not-exist"))
}

func TestSetupUnwritableDirectory(t *testing.T) {
	cfg := newTestConfig(t)
	// 把日志目录换成一个普通文件，OpenFile 必然失败
	broken := filepath.Join(t.TempDir(), "not-a-dir")
	if err := os.WriteFile(broken, []byte("x"), 0o644); err != nil {
		t.Fatalf("准备失败: %v", err)
	}
	cfg.LogsDir = broken

	if _, err := Setup(cfg); err == nil {
		t.Fatalf("日志目录不可用时应返回错误")
	}
}
