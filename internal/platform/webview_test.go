package platform

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// newRuntimeDir 造一个「长得像 WebView2 Fixed Version 运行时」的目录。
func newRuntimeDir(t *testing.T, versionDirs ...string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, bundledWebviewExeName), []byte("stub"), 0o600); err != nil {
		t.Fatalf("写入桩文件失败: %v", err)
	}
	for _, v := range versionDirs {
		if err := os.Mkdir(filepath.Join(dir, v), 0o755); err != nil {
			t.Fatalf("创建版本目录失败: %v", err)
		}
	}
	return dir
}

// TestValidWebviewDirRequiresHostExe 目录里没有宿主进程就不能当运行时用。
// 把一个空目录传给 Wails 的 WebviewBrowserPath 会让应用直接起不来，
// 这一层校验就是为了让它退回系统内核而不是崩掉。
func TestValidWebviewDirRequiresHostExe(t *testing.T) {
	if got := validWebviewDir(""); got != "" {
		t.Fatalf("空路径应返回空，得到 %q", got)
	}
	if got := validWebviewDir(t.TempDir()); got != "" {
		t.Fatalf("没有 %s 的目录不该被接受，得到 %q", bundledWebviewExeName, got)
	}

	dir := newRuntimeDir(t)
	if got := validWebviewDir(dir); got != dir {
		t.Fatalf("合法运行时目录应原样返回，得到 %q", got)
	}
}

// TestBundledWebviewPathEnvOverride 环境变量能指定任意运行时目录，
// 也能强制走系统内核——两种形态是同一个二进制，靠它才能在一台机器上都跑一遍。
func TestBundledWebviewPathEnvOverride(t *testing.T) {
	dir := newRuntimeDir(t)

	// 显式指定在所有平台上都生效（见 BundledWebviewPath 的注释），
	// 这样这条路径的单测在 Linux / macOS 的 CI 上也能真正跑到。
	t.Setenv(WebviewPathEnv, dir)
	if got := BundledWebviewPath(); got != dir {
		t.Fatalf("显式指定的目录应被采用，得到 %q", got)
	}

	// 大小写不敏感，免得用户写 "System" 就失效
	for _, v := range []string{WebviewPathSystem, "System", " SYSTEM "} {
		t.Setenv(WebviewPathEnv, v)
		if got := BundledWebviewPath(); got != "" {
			t.Fatalf("%q 应强制走系统内核，得到 %q", v, got)
		}
	}

	// 指了个不存在的目录：退回系统内核，而不是把坏路径递给 Wails
	t.Setenv(WebviewPathEnv, filepath.Join(dir, "does-not-exist"))
	if got := BundledWebviewPath(); got != "" {
		t.Fatalf("无效目录应退回系统内核，得到 %q", got)
	}
}

// TestWebviewSourceMatchesPath Source 与 Path 必须始终一致，
// 前端就是靠 Source 判断当前跑的是哪种发行包。
func TestWebviewSourceMatchesPath(t *testing.T) {
	t.Setenv(WebviewPathEnv, WebviewPathSystem)
	info := Webview()
	if info.Source != WebviewSourceSystem || info.Path != "" {
		t.Fatalf("强制系统内核时应为 system 且路径为空，得到 %+v", info)
	}
	if info.Engine == "" {
		t.Fatal("内核名称不应为空")
	}

	dir := newRuntimeDir(t, "132.0.2957.140")
	t.Setenv(WebviewPathEnv, dir)
	info = Webview()
	if info.Source != WebviewSourceBundled || info.Path != dir {
		t.Fatalf("指定运行时目录时应为 bundled，得到 %+v", info)
	}
	// 非 Windows 上没有 WebView2，webviewInfo 不会去读版本，这里只校验 Windows
	if runtime.GOOS == "windows" && info.Version == "" {
		t.Fatal("Windows 上应能从目录结构推断出版本号")
	}
}

// TestVersionFromRuntimeDir 版本目录的识别与取舍。
func TestVersionFromRuntimeDir(t *testing.T) {
	if got := versionFromRuntimeDir(""); got != "" {
		t.Fatalf("空路径应返回空，得到 %q", got)
	}
	if got := versionFromRuntimeDir(filepath.Join(t.TempDir(), "nope")); got != "" {
		t.Fatalf("不存在的目录应返回空，得到 %q", got)
	}

	// 只有版本号形状的子目录才算数
	dir := newRuntimeDir(t, "132.0.2957.140", "Locales", "1.2")
	if got := versionFromRuntimeDir(dir); got != "132.0.2957.140" {
		t.Fatalf("应挑出版本目录，得到 %q", got)
	}

	// 有多个时按数值比大小，不能用字符串比较（"99" > "132"）
	multi := newRuntimeDir(t, "99.0.1.1", "132.0.2957.140")
	if got := versionFromRuntimeDir(multi); got != "132.0.2957.140" {
		t.Fatalf("应取版本号最大的，得到 %q", got)
	}
}

func TestVersionLess(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"99.0.1.1", "132.0.2957.140", true},
		{"132.0.2957.140", "99.0.1.1", false},
		{"1.2.3", "1.2.3", false},
		{"1.2", "1.2.0", false}, // 缺省段按 0 处理
		{"1.2", "1.2.1", true},  // 缺省段按 0 处理
		{"1.10.0", "1.9.0", false},
	}
	for _, c := range cases {
		if got := versionLess(c.a, c.b); got != c.want {
			t.Errorf("versionLess(%q, %q) = %v, 期望 %v", c.a, c.b, got, c.want)
		}
	}
}

func TestJoinVersion(t *testing.T) {
	if got := joinVersion(132, 0, 2957, 140); got != "132.0.2957.140" {
		t.Fatalf("joinVersion 结果错误: %q", got)
	}
}
