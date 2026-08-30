package services

import (
	"testing"

	"PostPigeon/internal/models"
	"PostPigeon/internal/updates"
)

const testChangelog = `# 变更日志

## [未发布]

### 新增

- 还没发布

## [1.2.0] - 2026-08-26

### 新增

- 集合运行器

## [1.1.0] - 2026-07-01

### 修复

- 修了个 bug
`

// 更新器未启用（开发构建）时，界面仍要能拿到一份自洽的状态，
// 而所有会真正动到磁盘的操作都必须被挡住。
func TestUpdateInfoWhenDisabled(t *testing.T) {
	db := newTestDB(t)
	svc := NewUpdaterService(db, nil, testChangelog)

	info := svc.GetUpdateInfo()
	if info.Enabled {
		t.Error("mgr 为 nil 时 Enabled 应为 false")
	}
	if info.CanSelfUpdate {
		t.Error("mgr 为 nil 时 CanSelfUpdate 应为 false")
	}
	if info.BlockedReason != "dev" {
		t.Errorf("BlockedReason = %q，期望 dev", info.BlockedReason)
	}
	if info.Available != nil {
		t.Error("没有检查过时不应有可用版本")
	}
	if !info.Settings.AutoCheck {
		t.Error("默认应开启自动检查")
	}

	if err := svc.DownloadAndInstall(); err == nil {
		t.Error("未启用时 DownloadAndInstall 应报错")
	}
	if err := svc.RestartToApply(); err == nil {
		t.Error("未启用时 RestartToApply 应报错")
	}
	if err := svc.SkipAvailableVersion(); err == nil {
		t.Error("未启用时 SkipAvailableVersion 应报错")
	}
	if _, err := svc.CheckForUpdate(); err == nil {
		t.Error("未启用时 CheckForUpdate 应报错")
	}
}

// 未 Attach 的管理器同样要被当成不可用，而不是让调用穿透到 nil updater。
func TestUpdateInfoWithUnattachedManager(t *testing.T) {
	db := newTestDB(t)
	mgr, err := updates.New(updates.Options{
		Repository:     "AkagiYui/post-pigeon",
		AppName:        "PostPigeon",
		CurrentVersion: "1.0.0",
	})
	if err != nil {
		t.Fatalf("构造管理器失败：%v", err)
	}
	svc := NewUpdaterService(db, mgr, testChangelog)

	info := svc.GetUpdateInfo()
	if info.Enabled {
		t.Error("未 Attach 时 Enabled 应为 false")
	}
	if info.CurrentVersion != "1.0.0" {
		t.Errorf("CurrentVersion = %q，期望 1.0.0", info.CurrentVersion)
	}
	if info.ReleasesURL == "" {
		t.Error("即使不能自更新，也要给出发布页地址")
	}
}

func TestUpdateSettingsRoundTrip(t *testing.T) {
	db := newTestDB(t)
	svc := NewUpdaterService(db, nil, testChangelog)

	want := models.UpdateSettings{
		AutoCheck:         false,
		IncludePrerelease: true,
		SkippedVersion:    "1.3.0",
	}
	if err := svc.SaveUpdateSettings(want); err != nil {
		t.Fatalf("保存设置失败：%v", err)
	}

	got := svc.GetUpdateSettings()
	if got != want {
		t.Errorf("读回的设置 = %+v，期望 %+v", got, want)
	}
	if info := svc.GetUpdateInfo(); info.Settings != want {
		t.Errorf("GetUpdateInfo 里的设置 = %+v，期望 %+v", info.Settings, want)
	}
}

func TestGetLocalChangelog(t *testing.T) {
	db := newTestDB(t)
	svc := NewUpdaterService(db, nil, testChangelog)

	entries := svc.GetLocalChangelog()
	if len(entries) != 2 {
		t.Fatalf("正式版本数 = %d，期望 2（「未发布」应被滤掉）：%+v", len(entries), entries)
	}
	if entries[0].Version != "1.2.0" {
		t.Errorf("应按版本从新到旧排序，首个为 %q", entries[0].Version)
	}
}

// 没有待更新版本时不该报错，只是没有内容可展示。
func TestGetPendingChangelogWithoutPending(t *testing.T) {
	db := newTestDB(t)
	mgr, err := updates.New(updates.Options{
		Repository:     "AkagiYui/post-pigeon",
		AppName:        "PostPigeon",
		CurrentVersion: "1.0.0",
	})
	if err != nil {
		t.Fatalf("构造管理器失败：%v", err)
	}
	svc := NewUpdaterService(db, mgr, testChangelog)

	got, err := svc.GetPendingChangelog()
	if err != nil {
		t.Fatalf("GetPendingChangelog 失败：%v", err)
	}
	if len(got.Entries) != 0 || got.Fallback != "" {
		t.Errorf("没有待更新版本时应返回空结果，实际 %+v", got)
	}
}

// ApplySettings 在管理器为 nil 时必须是空操作，不能 panic。
func TestApplySettingsWithoutManager(t *testing.T) {
	db := newTestDB(t)
	svc := NewUpdaterService(db, nil, testChangelog)
	svc.ApplySettings(models.UpdateSettings{IncludePrerelease: true, SkippedVersion: "9.9.9"})
}

func TestUserFacingReleaseNotesDropsCommitAppendix(t *testing.T) {
	const notes = "### 新增\n\n- 用户功能\n\n<!-- postpigeon:commit-details -->\n<details>提交</details>"
	if got, want := userFacingReleaseNotes(notes), "### 新增\n\n- 用户功能"; got != want {
		t.Errorf("兜底发布说明 = %q，期望 %q", got, want)
	}
	if got := userFacingReleaseNotes("  只有正文  \n"); got != "只有正文" {
		t.Errorf("无标记正文应只去首尾空白，实际 %q", got)
	}
	if got := userFacingReleaseNotes("正文\n\n<details><summary>完整提交记录</summary>\n旧附录"); got != "正文" {
		t.Errorf("旧版提交附录也应隐藏，实际 %q", got)
	}
}
