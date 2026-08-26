// Package updates 把 Wails 内置的 updater 收敛成应用自己的更新管理器。
//
// 更新源是 GitHub Releases：tag（v1.2.0）是版本号的唯一真实来源，构建时经
// ldflags 注入到 config.Version，运行时再拿它和 Release 的 tag 比对。下载完成
// 后由 Wails 校验 SHA-256（发布流程会传 SHA256SUMS 侧车资产）并原子替换可执行
// 文件，重启后生效。
//
// 这里没有用 updater 自带的更新窗口（updater.WindowNone）：应用已有完整的
// i18n 与设计体系，框架窗口是英文硬编码的独立样式，混在一起很割裂。更新流程
// 的每一步都会通过 Wails 事件总线广播（wails:updater:*），前端据此渲染自己的
// 界面。
package updates

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

// ErrDisabled 表示更新器没有启用（开发构建、或 Attach 尚未调用）。
var ErrDisabled = errors.New("updates: 更新器未启用")

// Release 是一个可用版本，等价于 updater.Release。取个别名，让调用方不必直接
// 依赖 Wails 的 updater 包。
type Release = updater.Release

// 远端 CHANGELOG.md 的大小上限，防止畸形响应把内存吃满。
const maxChangelogBytes = 1 << 20

// Options 是管理器的构造参数。
type Options struct {
	// Repository 更新源仓库，"owner/repo" 形式。
	Repository string
	// AppName 更新产物文件名的前缀，需与发布流程一致。
	AppName string
	// CurrentVersion 当前运行的版本号，不带 v 前缀。
	CurrentVersion string
	// ChecksumAsset 校验和侧车资产名（如 "SHA256SUMS"），为空则跳过摘要校验。
	ChecksumAsset string
	// BaseURL 覆盖 https://github.com，用于 GitHub Enterprise 与测试。
	// 只影响发布页地址与 Release 资产的下载地址，不影响 API 请求。
	BaseURL string
	// APIBaseURL 覆盖 https://api.github.com，用于 GitHub Enterprise 与测试。
	APIBaseURL string
	// HTTPClient 拉取远端 CHANGELOG.md 用的客户端，为空则用带超时的默认值。
	HTTPClient *http.Client
}

// Manager 管理更新的检查、下载与应用。
type Manager struct {
	opts     Options
	provider *dynamicProvider
	client   *http.Client

	mu      sync.RWMutex
	up      *updater.Updater
	pending *updater.Release

	stopOnce sync.Once
	stop     chan struct{}
	// done 在后台检查启动时创建，未启动时为 nil。
	done chan struct{}
}

// New 构造管理器。此时还没有接上 Wails 的 updater，检查类操作都会返回
// ErrDisabled，直到 Attach 被调用。
func New(opts Options) (*Manager, error) {
	if opts.Repository == "" {
		return nil, errors.New("updates: Repository 不能为空")
	}
	if opts.CurrentVersion == "" {
		return nil, errors.New("updates: CurrentVersion 不能为空")
	}

	matcher := assetMatcher(opts.AppName)
	stable, err := github.New(github.Config{
		Repository:    opts.Repository,
		ChecksumAsset: opts.ChecksumAsset,
		AssetMatcher:  matcher,
		BaseURL:       opts.APIBaseURL,
	})
	if err != nil {
		return nil, fmt.Errorf("updates: 构造 GitHub provider 失败: %w", err)
	}
	pre, err := github.New(github.Config{
		Repository:    opts.Repository,
		ChecksumAsset: opts.ChecksumAsset,
		AssetMatcher:  matcher,
		BaseURL:       opts.APIBaseURL,
		Prerelease:    true,
	})
	if err != nil {
		return nil, fmt.Errorf("updates: 构造 GitHub 预发布 provider 失败: %w", err)
	}

	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	if opts.BaseURL == "" {
		opts.BaseURL = "https://github.com"
	}
	opts.BaseURL = strings.TrimSuffix(opts.BaseURL, "/")

	return &Manager{
		opts:     opts,
		provider: &dynamicProvider{stable: stable, pre: pre},
		client:   client,
		stop:     make(chan struct{}),
	}, nil
}

// Attach 把管理器接到 Wails 的 updater 上。必须在 application.New 之后调用。
func (m *Manager) Attach(up *updater.Updater) error {
	if up == nil {
		return errors.New("updates: updater 为空")
	}
	err := up.Init(updater.Config{
		CurrentVersion: m.opts.CurrentVersion,
		Providers:      []updater.Provider{m.provider},
		// 不用框架自带窗口，界面由前端按应用自己的设计体系渲染
		Window: updater.WindowNone,
	})
	if err != nil {
		return fmt.Errorf("updates: 初始化 updater 失败: %w", err)
	}
	m.mu.Lock()
	m.up = up
	m.mu.Unlock()
	return nil
}

// Enabled 报告更新器是否已接上。
func (m *Manager) Enabled() bool { return m.updater() != nil }

func (m *Manager) updater() *updater.Updater {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.up
}

// CurrentVersion 返回当前运行的版本号。
func (m *Manager) CurrentVersion() string { return m.opts.CurrentVersion }

// SetIncludePrerelease 切换是否接收预发布版本。下次检查即生效，不需要重启。
func (m *Manager) SetIncludePrerelease(v bool) { m.provider.setIncludePrerelease(v) }

// SkipVersion 记录用户跳过的版本；后续检查会把该版本视作「已是最新」。
// Wails 只在内存里记录跳过的版本，持久化由调用方负责（应用启动时回填）。
func (m *Manager) SkipVersion(v string) {
	if up := m.updater(); up != nil {
		up.SkipVersion(v)
	}
}

// State 返回更新流程当前所处的阶段。
func (m *Manager) State() string {
	up := m.updater()
	if up == nil {
		return string(updater.StateUnconfigured)
	}
	return string(up.State())
}

// Pending 返回最近一次检查发现的可用版本，没有则为 nil。
func (m *Manager) Pending() *updater.Release {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.pending
}

// Check 检查是否有新版本。返回 (nil, nil) 表示已是最新。
func (m *Manager) Check(ctx context.Context) (*updater.Release, error) {
	up := m.updater()
	if up == nil {
		return nil, ErrDisabled
	}
	rel, err := up.Check(ctx)
	if err != nil {
		return nil, err
	}
	m.mu.Lock()
	m.pending = rel
	m.mu.Unlock()
	return rel, nil
}

// DownloadAndInstall 下载并校验待安装的版本，成功后暂存等待重启。
// 必须先调用 Check。
func (m *Manager) DownloadAndInstall(ctx context.Context) error {
	up := m.updater()
	if up == nil {
		return ErrDisabled
	}
	return up.DownloadAndInstall(ctx)
}

// Restart 重启应用以应用已暂存的更新。调用后应用会退出。
func (m *Manager) Restart(ctx context.Context) error {
	up := m.updater()
	if up == nil {
		return ErrDisabled
	}
	return up.Restart(ctx)
}

// StartPeriodicCheck 每隔 interval 检查一次新版本（首次检查延迟 delay，
// 避免和启动时的其它初始化抢资源）。只检查、不自动下载：是否下载由用户决定。
//
// 这里没有用 updater.Config.CheckInterval，因为它驱动的是 CheckAndInstall，
// 在无窗口模式下会静默下载安装，对按流量计费的网络不友好。
func (m *Manager) StartPeriodicCheck(delay, interval time.Duration) {
	if !m.Enabled() || interval <= 0 {
		return
	}

	m.mu.Lock()
	if m.done != nil { // 已经启动过
		m.mu.Unlock()
		return
	}
	done := make(chan struct{})
	m.done = done
	m.mu.Unlock()

	go func() {
		defer close(done)

		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-m.stop:
			return
		case <-timer.C:
		}

		for {
			m.checkQuietly()
			select {
			case <-m.stop:
				return
			case <-time.After(interval):
			}
		}
	}()
}

// StopPeriodicCheck 停止后台检查并等待其退出。没有启动过时直接返回，
// 重复调用是安全的。
func (m *Manager) StopPeriodicCheck() {
	m.mu.RLock()
	done := m.done
	m.mu.RUnlock()
	if done == nil {
		return
	}
	m.stopOnce.Do(func() { close(m.stop) })
	<-done
}

// checkQuietly 执行一次后台检查：失败只记日志，不打扰用户。
// 发现新版本时 updater 会自行广播 wails:updater:update-available 事件。
func (m *Manager) checkQuietly() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rel, err := m.Check(ctx)
	switch {
	case err != nil:
		slog.Debug("后台检查更新失败", "error", err)
	case rel != nil:
		slog.Info("发现新版本", "version", rel.Version)
	}
}

// ReleasesURL 返回发布列表页地址。
func (m *Manager) ReleasesURL() string {
	return m.opts.BaseURL + "/" + m.opts.Repository + "/releases"
}

// ReleaseURL 返回指定版本的发布页地址。
func (m *Manager) ReleaseURL(version string) string {
	if version == "" {
		return m.ReleasesURL()
	}
	return m.opts.BaseURL + "/" + m.opts.Repository + "/releases/tag/v" + strings.TrimPrefix(version, "v")
}

// FetchChangelog 拉取指定版本 Release 里附带的 CHANGELOG.md 全文。
//
// 跨版本聚合走的是这条路而不是 GitHub API：一次请求就能拿到完整历史，没有
// 未认证 API 的 60 次/小时限流，拿到的还是人工润色过的文案而非 commit 流水。
func (m *Manager) FetchChangelog(ctx context.Context, version string) (string, error) {
	url := fmt.Sprintf("%s/%s/releases/download/v%s/CHANGELOG.md",
		m.opts.BaseURL, m.opts.Repository, strings.TrimPrefix(version, "v"))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "text/plain, text/markdown, */*")

	resp, err := m.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("updates: 拉取变更日志失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("updates: 拉取变更日志失败: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxChangelogBytes))
	if err != nil {
		return "", fmt.Errorf("updates: 读取变更日志失败: %w", err)
	}
	return string(body), nil
}

// SelfUpdateBlockedReason 返回当前环境不能原地自更新的原因，可以自更新时返回
// 空字符串。
//
// 自更新的本质是替换正在运行的可执行文件，包管理器装的副本（/usr/bin 下的
// deb/rpm、Program Files 里的 NSIS 安装版）与 AppImage 都不该被这么动：前者
// 会和包管理器的记账对不上，后者运行的根本不是磁盘上那个 .AppImage 文件。
// 这些情况下只提示新版本并引导去下载页。
func SelfUpdateBlockedReason() string {
	if os.Getenv("APPIMAGE") != "" {
		return "appimage"
	}

	exe, err := os.Executable()
	if err != nil {
		return "unknown"
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}

	// macOS 换的是整个 .app 包，写权限要看包所在目录
	target := exe
	if runtime.GOOS == "darwin" {
		if i := strings.Index(exe, ".app"+string(filepath.Separator)+"Contents"+string(filepath.Separator)); i >= 0 {
			target = exe[:i+len(".app")]
		}
	}

	if !dirWritable(filepath.Dir(target)) {
		return "readonly"
	}
	return ""
}

// dirWritable 用「能否创建临时文件」判断目录可写。比解析权限位可靠：
// 跨平台一致，也顺带覆盖了只读挂载与 ACL 的情况。
func dirWritable(dir string) bool {
	f, err := os.CreateTemp(dir, ".postpigeon-write-check-*")
	if err != nil {
		return false
	}
	name := f.Name()
	_ = f.Close()
	_ = os.Remove(name)
	return true
}

// assetMatcher 返回只认本项目发布产物命名的资产匹配器。
//
// 命名规范：<AppName>-<GOOS>-<GOARCH>[.zip|.tar.gz|.exe]，与 release.yaml 中
// 打包步骤一一对应。不用框架默认匹配器是因为它按 GOOS/GOARCH 子串模糊匹配，
// 同一个 Release 里的 .deb / .rpm / AppImage 一旦文件名里带上平台字样就会被
// 误选，用户会拿到一个安装包去替换正在运行的程序。
func assetMatcher(appName string) func(updater.CheckRequest, []github.ReleaseAsset) int {
	return func(req updater.CheckRequest, assets []github.ReleaseAsset) int {
		prefix := strings.ToLower(appName + "-" + req.Platform + "-" + req.Arch)
		for i, a := range assets {
			name := strings.ToLower(a.Name)
			if !strings.HasPrefix(name, prefix) {
				continue
			}
			switch strings.TrimPrefix(name, prefix) {
			case "", ".zip", ".tar.gz", ".exe":
				return i
			}
		}
		return -1
	}
}

// dynamicProvider 按「是否接收预发布版本」在两个 GitHub provider 之间转发。
//
// provider 的 Prerelease 是构造时固定的，而这个开关是用户设置项；包一层就能
// 让开关立刻生效，不必重启应用（updater.Init 只能调用一次）。Download 走的是
// Release.Metadata 里的下载地址，与 provider 自身状态无关，所以转发是安全的。
type dynamicProvider struct {
	mu     sync.RWMutex
	stable updater.Provider
	pre    updater.Provider
	usePre bool
}

func (p *dynamicProvider) setIncludePrerelease(v bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.usePre = v
}

func (p *dynamicProvider) active() updater.Provider {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.usePre {
		return p.pre
	}
	return p.stable
}

func (p *dynamicProvider) Name() string { return "github" }

func (p *dynamicProvider) Check(ctx context.Context, req updater.CheckRequest) (*updater.Release, error) {
	return p.active().Check(ctx, req)
}

func (p *dynamicProvider) Download(ctx context.Context, rel *updater.Release, dst io.Writer, onProgress func(written, total int64)) error {
	return p.active().Download(ctx, rel, dst, onProgress)
}
