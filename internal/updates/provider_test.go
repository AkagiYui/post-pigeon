package updates

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/updater"
)

// 这一组用例用一个假的 GitHub API 打通「检查 → 选资产 → 校验和」整条链路。
// 单测资产匹配器只能保证挑对文件名，挑不出 ChecksumAsset 写错、预发布通道接反
// 这类配置层面的错误——而它们出错时是静默降级（不校验摘要 / 收不到更新），
// 恰恰是最难在生产上发现的。

const updaterAsset = "PostPigeon-linux-amd64.tar.gz"

// newFakeGitHub 返回一个假的 GitHub API，以及产物内容的 SHA-256。
func newFakeGitHub(t *testing.T, payload string) (*httptest.Server, string) {
	t.Helper()

	sum := sha256.Sum256([]byte(payload))
	digest := hex.EncodeToString(sum[:])

	mux := http.NewServeMux()
	srv := httptest.NewUnstartedServer(mux)

	release := func(tag string, prerelease bool) map[string]any {
		return map[string]any{
			"tag_name":     tag,
			"name":         tag,
			"body":         "## 更新内容\n\n- 修了个 bug",
			"prerelease":   prerelease,
			"draft":        false,
			"published_at": "2026-08-26T10:00:00Z",
			"assets": []map[string]any{
				{
					"name":                 "SHA256SUMS",
					"size":                 64,
					"browser_download_url": "PLACEHOLDER/sha256sums",
				},
				{
					"name":                 "PostPigeon-linux-amd64-installer.exe",
					"size":                 int64(len(payload)),
					"browser_download_url": "PLACEHOLDER/installer",
				},
				{
					"name":                 updaterAsset,
					"size":                 int64(len(payload)),
					"browser_download_url": "PLACEHOLDER/asset",
				},
			},
		}
	}

	mux.HandleFunc("/repos/o/r/releases/latest", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, rewriteURLs(release("v2.0.0", false), srv))
	})
	mux.HandleFunc("/repos/o/r/releases", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, []any{
			rewriteURLs(release("v2.1.0-beta.1", true), srv),
			rewriteURLs(release("v2.0.0", false), srv),
		})
	})
	mux.HandleFunc("/sha256sums", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintf(w, "%s  %s\n", digest, updaterAsset)
	})
	mux.HandleFunc("/asset", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(payload))
	})

	srv.Start()
	t.Cleanup(srv.Close)
	return srv, digest
}

// rewriteURLs 把资产里的占位地址替换成测试服务的真实地址。
func rewriteURLs(release map[string]any, srv *httptest.Server) map[string]any {
	for _, a := range release["assets"].([]map[string]any) {
		url := a["browser_download_url"].(string)
		a["browser_download_url"] = strings.Replace(url, "PLACEHOLDER", srv.URL, 1)
	}
	return release
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func newProviderTestManager(t *testing.T, apiBase string) *Manager {
	t.Helper()
	m, err := New(Options{
		Repository:     "o/r",
		AppName:        "PostPigeon",
		CurrentVersion: "1.0.0",
		ChecksumAsset:  "SHA256SUMS",
		APIBaseURL:     apiBase,
	})
	if err != nil {
		t.Fatalf("New 失败：%v", err)
	}
	return m
}

func TestProviderPicksUpdaterAssetAndDigest(t *testing.T) {
	const payload = "fake application bytes"
	srv, digest := newFakeGitHub(t, payload)
	m := newProviderTestManager(t, srv.URL)

	rel, err := m.provider.Check(context.Background(), updater.CheckRequest{
		CurrentVersion: "1.0.0", Platform: "linux", Arch: "amd64",
	})
	if err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if rel == nil {
		t.Fatal("应发现新版本 2.0.0")
	}

	if rel.Version != "2.0.0" {
		t.Errorf("Version = %q，期望 2.0.0（tag 的 v 前缀应被去掉）", rel.Version)
	}
	if rel.Artifact.Filename != updaterAsset {
		t.Errorf("选中的产物 = %q，期望 %q", rel.Artifact.Filename, updaterAsset)
	}
	if rel.Notes == "" {
		t.Error("Release 正文应作为兜底说明带回来")
	}

	// ChecksumAsset 配错时这里会是 nil——即静默退化成「下载什么装什么」
	if rel.Verification == nil || rel.Verification.DigestAlgo != "sha256" {
		t.Fatalf("未从 SHA256SUMS 解析出摘要：%+v", rel.Verification)
	}
	if got := hex.EncodeToString(rel.Verification.Digest); got != digest {
		t.Errorf("摘要 = %s，期望 %s", got, digest)
	}
}

func TestProviderRespectsPrereleaseChannel(t *testing.T) {
	srv, _ := newFakeGitHub(t, "fake application bytes")
	m := newProviderTestManager(t, srv.URL)
	req := updater.CheckRequest{CurrentVersion: "1.0.0", Platform: "linux", Arch: "amd64"}

	rel, err := m.provider.Check(context.Background(), req)
	if err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if rel.Version != "2.0.0" {
		t.Errorf("默认通道应拿到正式版 2.0.0，实际 %q", rel.Version)
	}

	m.SetIncludePrerelease(true)
	rel, err = m.provider.Check(context.Background(), req)
	if err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if rel.Version != "2.1.0-beta.1" {
		t.Errorf("预发布通道应拿到 2.1.0-beta.1，实际 %q", rel.Version)
	}
}

// 已是最新时 provider 必须返回 (nil, nil)，而不是把同版本当成更新推给用户。
func TestProviderReportsUpToDate(t *testing.T) {
	srv, _ := newFakeGitHub(t, "fake application bytes")
	m := newProviderTestManager(t, srv.URL)

	rel, err := m.provider.Check(context.Background(), updater.CheckRequest{
		CurrentVersion: "2.0.0", Platform: "linux", Arch: "amd64",
	})
	if err != nil {
		t.Fatalf("Check 失败：%v", err)
	}
	if rel != nil {
		t.Errorf("当前版本已是最新时不应返回更新：%+v", rel)
	}
}

// 该平台没有对应产物时应报错并进入下一个 provider，而不是错选别的文件。
func TestProviderNoAssetForPlatform(t *testing.T) {
	srv, _ := newFakeGitHub(t, "fake application bytes")
	m := newProviderTestManager(t, srv.URL)

	if _, err := m.provider.Check(context.Background(), updater.CheckRequest{
		CurrentVersion: "1.0.0", Platform: "darwin", Arch: "arm64",
	}); err == nil {
		t.Error("没有 darwin/arm64 产物时应报错")
	}
}

func TestProviderDownloadStreamsAsset(t *testing.T) {
	const payload = "fake application bytes"
	srv, _ := newFakeGitHub(t, payload)
	m := newProviderTestManager(t, srv.URL)

	rel, err := m.provider.Check(context.Background(), updater.CheckRequest{
		CurrentVersion: "1.0.0", Platform: "linux", Arch: "amd64",
	})
	if err != nil {
		t.Fatalf("Check 失败：%v", err)
	}

	var buf strings.Builder
	var lastWritten int64
	if err := m.provider.Download(context.Background(), rel, &buf, func(written, _ int64) {
		lastWritten = written
	}); err != nil {
		t.Fatalf("Download 失败：%v", err)
	}
	if buf.String() != payload {
		t.Errorf("下载内容 = %q，期望 %q", buf.String(), payload)
	}
	if lastWritten != int64(len(payload)) {
		t.Errorf("进度回调最终 written = %d，期望 %d", lastWritten, len(payload))
	}
}
