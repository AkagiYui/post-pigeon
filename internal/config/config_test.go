package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewCreatesDirectories(t *testing.T) {
	// XDG_CONFIG_HOME 在 Linux 下决定 os.UserConfigDir；macOS 忽略它，
	// 因此这里只断言目录被真正创建，不断言具体路径。
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	cfg, err := New()
	if err != nil {
		t.Fatalf("New err=%v", err)
	}

	for _, dir := range []string{cfg.DataDir, cfg.LogsDir} {
		info, err := os.Stat(dir)
		if err != nil {
			t.Fatalf("目录未创建: %s (%v)", dir, err)
		}
		if !info.IsDir() {
			t.Fatalf("%s 不是目录", dir)
		}
	}

	if filepath.Dir(cfg.DBPath) != cfg.DataDir {
		t.Errorf("数据库应位于数据目录下：%s", cfg.DBPath)
	}
	if !strings.HasSuffix(cfg.DBPath, ".db") {
		t.Errorf("数据库文件名=%s", cfg.DBPath)
	}
	if !strings.HasSuffix(cfg.DataDir, AppIdentifier) {
		t.Errorf("数据目录应以应用标识结尾：%s", cfg.DataDir)
	}
}

func TestNewIsIdempotent(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	first, err := New()
	if err != nil {
		t.Fatalf("New err=%v", err)
	}
	// 目录已存在时再次调用不应报错
	second, err := New()
	if err != nil {
		t.Fatalf("重复调用 New err=%v", err)
	}
	if *first != *second {
		t.Errorf("两次调用应返回相同配置：%+v vs %+v", first, second)
	}
}

func TestBuildMetadataDefaults(t *testing.T) {
	// 未经 ldflags 注入时应有可读的占位值，避免界面上出现空白
	if AppName == "" || AppIdentifier == "" {
		t.Fatalf("应用名与标识不能为空")
	}
	if Version == "" || BuildHash == "" || BuildTime == "" {
		t.Fatalf("版本信息不能为空：%q %q %q", Version, BuildHash, BuildTime)
	}
}
