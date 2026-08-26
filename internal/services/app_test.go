package services

import (
	"strings"
	"testing"

	"PostPigeon/internal/config"
)

// TestAppInfoIncludesReleaseLinks 「关于」里要能直接跳到历史版本页：
// 用户退回旧版本是常态，不该让他们自己去翻仓库。
func TestAppInfoIncludesReleaseLinks(t *testing.T) {
	info := NewAppService().GetAppInfo()

	if !strings.HasSuffix(info.RepositoryURL, config.Repository) {
		t.Fatalf("仓库地址 = %s，应指向 %s", info.RepositoryURL, config.Repository)
	}
	if !strings.HasPrefix(info.RepositoryURL, "https://github.com/") {
		t.Fatalf("仓库地址应是完整的 https 链接: %s", info.RepositoryURL)
	}
	if info.ReleasesURL != info.RepositoryURL+"/releases" {
		t.Fatalf("历史版本地址 = %s", info.ReleasesURL)
	}
	if info.Version == "" || info.BuildTime == "" {
		t.Fatalf("版本信息不完整: %+v", info)
	}
}
