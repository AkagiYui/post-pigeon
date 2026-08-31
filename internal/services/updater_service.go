package services

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/changelog"
	"PostPigeon/internal/config"
	"PostPigeon/internal/models"
	"PostPigeon/internal/updates"

	"gorm.io/gorm"
)

// 检查与下载的超时。下载的上限放得宽，跨国拉几十 MB 的产物并不快。
const (
	updateCheckTimeout    = 30 * time.Second
	updateDownloadTimeout = 30 * time.Minute
	updateCheckDelay      = 30 * time.Second
	updateCheckInterval   = 6 * time.Hour
)

// UpdaterService 应用更新服务。
//
// 更新流程的实时状态（检查中、下载进度、校验、就绪、失败）由 Wails 的 updater
// 通过事件总线广播，前端直接订阅 wails:updater:* 即可；这里只负责发起动作、
// 读写设置，以及做一件 updater 不做的事——把当前版本到最新版本之间的所有
// 变更日志聚合起来。
type UpdaterService struct {
	db  *gorm.DB
	mgr *updates.Manager
	// local 是随应用一起嵌入的 CHANGELOG.md 解析结果，用于「关于」里的历史记录。
	local []changelog.Entry
	// blockedReason 记录当前环境不能原地自更新的原因，空表示可以。
	blockedReason string
}

// NewUpdaterService 创建更新服务。mgr 为 nil 表示更新器未启用（开发构建、
// 或管理器构造失败），此时所有更新操作都会返回「更新不可用」。
func NewUpdaterService(db *gorm.DB, mgr *updates.Manager, localChangelog string) *UpdaterService {
	return &UpdaterService{
		db:            db,
		mgr:           mgr,
		local:         changelog.Releases(changelog.Parse(localChangelog)),
		blockedReason: updates.SelfUpdateBlockedReason(),
	}
}

// ReleaseInfo 是一个可用版本的摘要。
type ReleaseInfo struct {
	Version     string `json:"version"`     // 版本号，不带 v 前缀
	Name        string `json:"name"`        // Release 标题
	Notes       string `json:"notes"`       // Release 正文（Markdown）
	PublishedAt string `json:"publishedAt"` // RFC 3339 时间戳
	Size        int64  `json:"size"`        // 下载产物字节数
	Filename    string `json:"filename"`    // 下载产物文件名
	URL         string `json:"url"`         // 发布页地址
}

// UpdateInfo 是前端渲染更新界面需要的全部状态。
type UpdateInfo struct {
	// CurrentVersion 当前运行的版本号。
	CurrentVersion string `json:"currentVersion"`
	// State 更新流程所处阶段，取值见 Wails updater 的 State（idle / checking /
	// up-to-date / available / downloading / verifying / installing / ready / error）。
	State string `json:"state"`
	// Enabled 更新器是否可用。开发构建下恒为 false。
	Enabled bool `json:"enabled"`
	// CanSelfUpdate 能否原地替换可执行文件。为 false 时只提示新版本并引导到下载页。
	CanSelfUpdate bool `json:"canSelfUpdate"`
	// BlockedReason 不能自更新的原因：dev / appimage / readonly / unknown。
	BlockedReason string `json:"blockedReason"`
	// Available 最近一次检查发现的新版本，没有则为 null。
	Available *ReleaseInfo `json:"available"`
	// Settings 当前的更新设置。
	Settings models.UpdateSettings `json:"settings"`
	// ReleasesURL 发布列表页地址。
	ReleasesURL string `json:"releasesUrl"`
}

// UpdateChangelog 是「从当前版本到待更新版本之间」的变更日志。
type UpdateChangelog struct {
	// Entries 区间内的版本小节，按版本从新到旧排序。
	Entries []changelog.Entry `json:"entries"`
	// Fallback 拉不到结构化变更日志时的兜底文本（Release 正文）。
	Fallback string `json:"fallback"`
}

// GetUpdateInfo 返回当前的更新状态。
func (s *UpdaterService) GetUpdateInfo() UpdateInfo {
	info := UpdateInfo{
		// 更新器没启用时也要给出版本号，界面上「当前版本」不该是空的
		CurrentVersion: config.Version,
		State:          "unconfigured",
		Settings:       getUpdateSettings(s.db),
		BlockedReason:  s.blockedReason,
	}
	if s.mgr == nil {
		// 管理器压根没构造出来，绝大多数情况是开发构建
		info.BlockedReason = "dev"
		return info
	}

	info.Enabled = s.mgr.Enabled()
	info.CurrentVersion = s.mgr.CurrentVersion()
	info.State = s.mgr.State()
	info.ReleasesURL = s.mgr.ReleasesURL()
	info.CanSelfUpdate = info.Enabled && s.blockedReason == ""
	if !info.Enabled && info.BlockedReason == "" {
		// 构造出来了但没接上（Attach 失败），原因说不准
		info.BlockedReason = "unknown"
	}
	if rel := s.mgr.Pending(); rel != nil {
		info.Available = s.releaseInfo(rel)
	}
	return info
}

// CheckForUpdate 主动检查更新，返回检查后的最新状态。
func (s *UpdaterService) CheckForUpdate() (UpdateInfo, error) {
	if s.mgr == nil || !s.mgr.Enabled() {
		return s.GetUpdateInfo(), apperr.New(apperr.CodeUpdateDisabled)
	}

	ctx, cancel := context.WithTimeout(context.Background(), updateCheckTimeout)
	defer cancel()

	if _, err := s.mgr.Check(ctx); err != nil {
		slog.Warn("检查更新失败", "error", err)
		return s.GetUpdateInfo(), apperr.Wrap(err, apperr.CodeUpdateCheck)
	}
	return s.GetUpdateInfo(), nil
}

// DownloadAndInstall 下载并校验待安装版本，成功后暂存等待重启。
func (s *UpdaterService) DownloadAndInstall() error {
	if s.mgr == nil || !s.mgr.Enabled() {
		return apperr.New(apperr.CodeUpdateDisabled)
	}
	if s.blockedReason != "" {
		// 包管理器安装的副本与 AppImage 不能原地替换，见 SelfUpdateBlockedReason
		return apperr.New(apperr.CodeUpdateDisabled)
	}
	if s.mgr.Pending() == nil {
		return apperr.New(apperr.CodeUpdateNotReady)
	}

	ctx, cancel := context.WithTimeout(context.Background(), updateDownloadTimeout)
	defer cancel()

	if err := s.mgr.DownloadAndInstall(ctx); err != nil {
		slog.Error("下载更新失败", "error", err)
		return apperr.Wrap(err, apperr.CodeUpdateDownload)
	}
	return nil
}

// RestartToApply 重启应用以应用已暂存的更新。调用成功后应用会退出。
func (s *UpdaterService) RestartToApply() error {
	if s.mgr == nil || !s.mgr.Enabled() {
		return apperr.New(apperr.CodeUpdateDisabled)
	}
	if err := s.mgr.Restart(context.Background()); err != nil {
		slog.Error("应用更新失败", "error", err)
		if errors.Is(err, updates.ErrDisabled) {
			return apperr.New(apperr.CodeUpdateDisabled)
		}
		return apperr.Wrap(err, apperr.CodeUpdateRestart)
	}
	return nil
}

// SkipAvailableVersion 跳过当前发现的版本，之后的检查会把它当作「已是最新」。
func (s *UpdaterService) SkipAvailableVersion() error {
	if s.mgr == nil {
		return apperr.New(apperr.CodeUpdateDisabled)
	}
	rel := s.mgr.Pending()
	if rel == nil {
		return apperr.New(apperr.CodeUpdateNotReady)
	}

	settings := getUpdateSettings(s.db)
	settings.SkippedVersion = rel.Version
	return s.SaveUpdateSettings(settings)
}

// GetUpdateSettings 读取更新设置。
func (s *UpdaterService) GetUpdateSettings() models.UpdateSettings {
	return getUpdateSettings(s.db)
}

// SaveUpdateSettings 保存更新设置，并立刻应用到更新器（不需要重启）。
func (s *UpdaterService) SaveUpdateSettings(settings models.UpdateSettings) error {
	if err := NewSettingsService(s.db).SetSetting(models.SettingsKeyUpdate, models.ToJSON(settings)); err != nil {
		return err
	}
	s.ApplySettings(settings)
	return nil
}

// ApplySettings 把设置同步到更新器并启停后台检查。启动与保存共用这一入口，
// 跳过的版本、通道选择和自动检查开关都无需重启即可生效。
func (s *UpdaterService) ApplySettings(settings models.UpdateSettings) {
	if s.mgr == nil {
		return
	}
	s.mgr.SetIncludePrerelease(settings.IncludePrerelease)
	s.mgr.SkipVersion(settings.SkippedVersion)
	if settings.AutoCheck {
		s.mgr.StartPeriodicCheck(updateCheckDelay, updateCheckInterval)
	} else {
		s.mgr.StopPeriodicCheck()
	}
}

// GetLocalChangelog 返回随应用一起分发的变更日志（「关于」里的历史记录）。
func (s *UpdaterService) GetLocalChangelog() []changelog.Entry {
	return s.local
}

// GetPendingChangelog 返回「当前版本 → 待更新版本」之间的全部变更日志。
//
// updater 只会带回最新一条 Release 的说明，用户跨多个版本升级时中间版本的内容
// 会全部丢失。这里改从 Release 资产里的 CHANGELOG.md 全文按版本区间截取，一次
// 请求拿到完整历史，也没有未认证 GitHub API 的限流问题。拉取失败时退回 Release
// 正文，保证界面上总有东西可看。
func (s *UpdaterService) GetPendingChangelog() (UpdateChangelog, error) {
	if s.mgr == nil {
		return UpdateChangelog{}, apperr.New(apperr.CodeUpdateDisabled)
	}
	rel := s.mgr.Pending()
	if rel == nil {
		return UpdateChangelog{}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), updateCheckTimeout)
	defer cancel()

	md, err := s.mgr.FetchChangelog(ctx, rel.Version)
	if err != nil {
		slog.Warn("拉取远端变更日志失败，回退到 Release 说明", "version", rel.Version, "error", err)
		return UpdateChangelog{Fallback: userFacingReleaseNotes(rel.Notes)}, nil
	}

	entries := changelog.Between(changelog.Parse(md), s.mgr.CurrentVersion(), rel.Version)
	if len(entries) == 0 {
		return UpdateChangelog{Fallback: userFacingReleaseNotes(rel.Notes)}, nil
	}
	return UpdateChangelog{Entries: entries}, nil
}

// userFacingReleaseNotes 去掉 Release 正文里只供开发者排查的提交附录。正常路径会
// 下载结构化 CHANGELOG.md；这个兜底也应只给用户看人工整理的内容，不能因为资产
// 暂时拉不到就突然塞进几十条 commit hash。
func userFacingReleaseNotes(notes string) string {
	markers := [...]string{
		"<!-- postpigeon:commit-details -->",
		// 兼容加入显式标记之前已经发布的版本。
		"<details><summary>完整提交记录</summary>",
	}
	for _, marker := range markers {
		if before, _, found := strings.Cut(notes, marker); found {
			return strings.TrimSpace(before)
		}
	}
	return strings.TrimSpace(notes)
}

// releaseInfo 把 updater 的 Release 转成前端用的摘要。
func (s *UpdaterService) releaseInfo(rel *updates.Release) *ReleaseInfo {
	info := &ReleaseInfo{
		Version:  rel.Version,
		Name:     rel.Name,
		Notes:    rel.Notes,
		Size:     rel.Artifact.Size,
		Filename: rel.Artifact.Filename,
		URL:      s.mgr.ReleaseURL(rel.Version),
	}
	if !rel.PublishedAt.IsZero() {
		info.PublishedAt = rel.PublishedAt.UTC().Format(time.RFC3339)
	}
	return info
}

// getUpdateSettings 读取更新设置；无记录时返回默认值。
func getUpdateSettings(db *gorm.DB) models.UpdateSettings {
	settings := models.DefaultUpdateSettings
	raw := NewSettingsService(db).GetSetting(models.SettingsKeyUpdate)
	if raw != "" {
		_ = models.FromJSON(raw, &settings)
	}
	return settings
}
