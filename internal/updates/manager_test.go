package updates

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

func newTestManager(t *testing.T, baseURL string) *Manager {
	t.Helper()
	m, err := New(Options{
		Repository:     "AkagiYui/post-pigeon",
		AppName:        "PostPigeon",
		CurrentVersion: "1.0.0",
		ChecksumAsset:  "SHA256SUMS",
		BaseURL:        baseURL,
	})
	if err != nil {
		t.Fatalf("New 失败：%v", err)
	}
	return m
}

func TestNewValidatesOptions(t *testing.T) {
	if _, err := New(Options{CurrentVersion: "1.0.0"}); err == nil {
		t.Error("缺少 Repository 时应报错")
	}
	if _, err := New(Options{Repository: "a/b"}); err == nil {
		t.Error("缺少 CurrentVersion 时应报错")
	}
}

// 没有 Attach 时所有更新操作都应干净地返回 ErrDisabled，而不是 panic。
func TestOperationsWithoutAttach(t *testing.T) {
	m := newTestManager(t, "")
	if m.Enabled() {
		t.Error("未 Attach 时 Enabled 应为 false")
	}
	if _, err := m.Check(context.Background()); err != ErrDisabled {
		t.Errorf("Check = %v，期望 ErrDisabled", err)
	}
	if err := m.DownloadAndInstall(context.Background()); err != ErrDisabled {
		t.Errorf("DownloadAndInstall = %v，期望 ErrDisabled", err)
	}
	if err := m.Restart(context.Background()); err != ErrDisabled {
		t.Errorf("Restart = %v，期望 ErrDisabled", err)
	}
	if got := m.State(); got != string(updater.StateUnconfigured) {
		t.Errorf("State = %q，期望 unconfigured", got)
	}
	// 不该 panic
	m.SkipVersion("1.2.0")
}

func TestURLs(t *testing.T) {
	m := newTestManager(t, "")
	if got, want := m.ReleasesURL(), "https://github.com/AkagiYui/post-pigeon/releases"; got != want {
		t.Errorf("ReleasesURL = %q，期望 %q", got, want)
	}
	want := "https://github.com/AkagiYui/post-pigeon/releases/tag/v1.2.0"
	if got := m.ReleaseURL("1.2.0"); got != want {
		t.Errorf("ReleaseURL = %q，期望 %q", got, want)
	}
	if got := m.ReleaseURL("v1.2.0"); got != want {
		t.Errorf("带 v 前缀时 ReleaseURL = %q，期望 %q", got, want)
	}
	if m.ReleaseURL("") != m.ReleasesURL() {
		t.Error("版本为空时应回退到发布列表页")
	}
}

func TestFetchChangelog(t *testing.T) {
	const body = "# 变更日志\n\n## [1.2.0] - 2026-08-26\n"
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	m := newTestManager(t, srv.URL)
	got, err := m.FetchChangelog(context.Background(), "v1.2.0")
	if err != nil {
		t.Fatalf("FetchChangelog 失败：%v", err)
	}
	if got != body {
		t.Errorf("正文 = %q，期望 %q", got, body)
	}
	// 走的是 Release 资产而不是 GitHub API，v 前缀要补回 tag 上
	want := "/AkagiYui/post-pigeon/releases/download/v1.2.0/CHANGELOG.md"
	if gotPath != want {
		t.Errorf("请求路径 = %q，期望 %q", gotPath, want)
	}
}

func TestFetchChangelogNotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	m := newTestManager(t, srv.URL)
	if _, err := m.FetchChangelog(context.Background(), "1.2.0"); err == nil {
		t.Fatal("404 时应返回错误，让调用方回退到 Release 说明")
	}
}

// 超大响应必须被截断，而不是整个读进内存。
func TestFetchChangelogIsSizeCapped(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(strings.Repeat("x", maxChangelogBytes+4096)))
	}))
	defer srv.Close()

	m := newTestManager(t, srv.URL)
	got, err := m.FetchChangelog(context.Background(), "1.2.0")
	if err != nil {
		t.Fatalf("FetchChangelog 失败：%v", err)
	}
	if len(got) != maxChangelogBytes {
		t.Errorf("正文长度 = %d，期望被截断到 %d", len(got), maxChangelogBytes)
	}
}

func TestAssetMatcher(t *testing.T) {
	match := assetMatcher("PostPigeon")
	assets := []github.ReleaseAsset{
		{Name: "CHANGELOG.md"},
		{Name: "SHA256SUMS"},
		{Name: "PostPigeon-windows-amd64-installer.exe"},
		{Name: "PostPigeon-1.2.0-x86_64.AppImage"},
		{Name: "postpigeon_1.2.0_linux_amd64.deb"},
		{Name: "PostPigeon-darwin-arm64.zip"},
		{Name: "PostPigeon-windows-amd64.exe"},
		{Name: "PostPigeon-linux-amd64.tar.gz"},
	}

	cases := []struct {
		platform, arch string
		want           string
	}{
		{"darwin", "arm64", "PostPigeon-darwin-arm64.zip"},
		{"windows", "amd64", "PostPigeon-windows-amd64.exe"},
		{"linux", "amd64", "PostPigeon-linux-amd64.tar.gz"},
	}
	for _, c := range cases {
		idx := match(updater.CheckRequest{Platform: c.platform, Arch: c.arch}, assets)
		if idx < 0 {
			t.Errorf("%s/%s 未匹配到任何资产", c.platform, c.arch)
			continue
		}
		if got := assets[idx].Name; got != c.want {
			t.Errorf("%s/%s 匹配到 %q，期望 %q", c.platform, c.arch, got, c.want)
		}
	}
}

// 安装包（deb / AppImage / NSIS installer）绝不能被当成更新产物：
// 拿它替换正在运行的程序会直接把应用换成一个安装器。
func TestAssetMatcherRejectsInstallers(t *testing.T) {
	match := assetMatcher("PostPigeon")
	assets := []github.ReleaseAsset{
		{Name: "PostPigeon-windows-amd64-installer.exe"},
		{Name: "PostPigeon-linux-amd64.deb"},
		{Name: "PostPigeon-linux-amd64.AppImage"},
		{Name: "PostPigeon-darwin-arm64.dmg"},
	}
	for _, req := range []updater.CheckRequest{
		{Platform: "windows", Arch: "amd64"},
		{Platform: "linux", Arch: "amd64"},
		{Platform: "darwin", Arch: "arm64"},
	} {
		if idx := match(req, assets); idx >= 0 {
			t.Errorf("%s/%s 误选了 %q", req.Platform, req.Arch, assets[idx].Name)
		}
	}
}

func TestAssetMatcherNoMatch(t *testing.T) {
	match := assetMatcher("PostPigeon")
	assets := []github.ReleaseAsset{{Name: "PostPigeon-darwin-arm64.zip"}}
	if idx := match(updater.CheckRequest{Platform: "linux", Arch: "arm64"}, assets); idx != -1 {
		t.Errorf("没有匹配项时应返回 -1，实际 %d", idx)
	}
}

func TestDynamicProviderRouting(t *testing.T) {
	stable := &fakeProvider{name: "stable"}
	pre := &fakeProvider{name: "pre"}
	p := &dynamicProvider{stable: stable, pre: pre}

	if p.Name() != "github" {
		t.Errorf("Name = %q，期望 github", p.Name())
	}

	if _, err := p.Check(context.Background(), updater.CheckRequest{}); err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if stable.checks != 1 || pre.checks != 0 {
		t.Errorf("默认应走稳定通道，stable=%d pre=%d", stable.checks, pre.checks)
	}

	// 开关立刻生效，不需要重启
	p.setIncludePrerelease(true)
	if _, err := p.Check(context.Background(), updater.CheckRequest{}); err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if pre.checks != 1 {
		t.Errorf("开启预发布后应走预发布通道，pre=%d", pre.checks)
	}

	if err := p.Download(context.Background(), nil, nil, nil); err != nil {
		t.Fatalf("Download 失败：%v", err)
	}
	if pre.downloads != 1 {
		t.Errorf("Download 应转发到当前通道，pre=%d", pre.downloads)
	}
}

// StartPeriodicCheck 在未启用时也要能安全地 Start/Stop。
func TestPeriodicCheckDisabled(t *testing.T) {
	m := newTestManager(t, "")
	m.StartPeriodicCheck(time.Millisecond, time.Millisecond)
	m.StopPeriodicCheck()
	m.StopPeriodicCheck() // 幂等
}

type fakeProvider struct {
	name      string
	checks    int
	downloads int
}

func (f *fakeProvider) Name() string { return f.name }

func (f *fakeProvider) Check(context.Context, updater.CheckRequest) (*updater.Release, error) {
	f.checks++
	return nil, nil
}

func (f *fakeProvider) Download(context.Context, *updater.Release, io.Writer, func(int64, int64)) error {
	f.downloads++
	return nil
}
