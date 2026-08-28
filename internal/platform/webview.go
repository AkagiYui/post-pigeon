package platform

import (
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// BundledWebviewDirName 是随包分发的浏览器内核目录名，位于可执行文件同级。
//
// 只有 Windows 用得上：WebView2 支持「固定版本分发」（Fixed Version），把整个
// 运行时当成一堆文件跟着应用走，不安装、不写注册表、不需要管理员权限。这是精简版
// 系统、网吧还原卡与无盘环境唯一可靠的形态——Evergreen 运行时装完一重启就被还原
// 掉，而这个目录跟着应用文件夹走，永远不会丢。
const BundledWebviewDirName = "webview2"

// WebviewPathEnv 覆盖内核选择的环境变量。
//
//   - 设为目录路径：强制使用该目录里的运行时
//   - 设为 "system"：强制使用系统安装的运行时（即使同级存在 webview2/ 目录）
//   - 不设置：按 BundledWebviewPath 的默认规则自动选择
//
// 存在的意义是让同一台机器能把两种形态都跑一遍：内置版与系统版是同一个二进制，
// 差别只有目录里有没有那个文件夹，没有这个开关就得靠改文件名来回折腾。
const WebviewPathEnv = "POSTPIGEON_WEBVIEW_PATH"

// WebviewPathSystem 是 WebviewPathEnv 表示「强制走系统内核」的取值。
const WebviewPathSystem = "system"

// 内核来源。给前端展示用，也是判断当前跑的是哪种发行包的唯一依据。
const (
	// WebviewSourceBundled 用的是随包分发的内核。
	WebviewSourceBundled = "bundled"
	// WebviewSourceSystem 用的是系统安装的内核。
	WebviewSourceSystem = "system"
)

// WebviewInfo 描述应用当前使用的浏览器内核。
//
// 这些信息用户自己是查不到的：内核跑在另一个进程里，任务管理器只显示
// msedgewebview2.exe，看不出它来自哪个目录。排查「精简版系统上白屏」这类问题时，
// 第一件要确认的事就是它到底加载了哪份运行时。
type WebviewInfo struct {
	// Engine 内核名称，如 "WebView2"、"WKWebView"、"WebKitGTK"。
	Engine string `json:"engine"`
	// Version 运行时版本。取不到时为空字符串，由前端用 navigator.userAgent 兜底。
	Version string `json:"version"`
	// Source 内核来源，取值为 WebviewSourceBundled 或 WebviewSourceSystem。
	Source string `json:"source"`
	// Path 内置内核所在目录；走系统内核时为空。
	Path string `json:"path"`
}

// Webview 返回当前进程实际使用的浏览器内核信息。
func Webview() WebviewInfo {
	info := webviewInfo()
	info.Path = BundledWebviewPath()
	if info.Path == "" {
		info.Source = WebviewSourceSystem
	} else {
		info.Source = WebviewSourceBundled
	}
	return info
}

// BundledWebviewPath 返回随包分发的内核目录，没有则返回空字符串。
//
// 返回值直接喂给 Wails 的 WindowsOptions.WebviewBrowserPath：那个字段为空时
// Wails 会去找系统安装的运行时，非空时用指定目录。也就是说「内置版」与「常规版」
// 可以是同一个二进制，运行期按目录里有没有那个文件夹自动选择——用户手上的常规版
// 哪天碰到系统运行时损坏，把目录拷进去就能自救，不必重装。
//
// 非 Windows 平台上的自动探测恒为空：macOS 的 WKWebView 与 Linux 的 WebKitGTK
// 都是系统组件，没有随包分发这一说。但用 WebviewPathEnv 显式指定的目录在所有平台
// 上都会被采用——非 Windows 上 Wails 根本不看这个字段，返回什么都无害，而保持行为
// 一致能让这条路径的单测在 Linux / macOS 的 CI 上也真正跑到。
func BundledWebviewPath() string {
	switch override := strings.TrimSpace(os.Getenv(WebviewPathEnv)); {
	case override == "":
		// 未设置，走下面的默认探测
	case strings.EqualFold(override, WebviewPathSystem):
		return ""
	default:
		return validWebviewDir(override)
	}
	return validWebviewDir(defaultBundledWebviewDir())
}

// defaultBundledWebviewDir 返回默认的内置内核目录（可执行文件同级的 webview2/）。
// 拿不到可执行文件路径时返回空字符串。
func defaultBundledWebviewDir() string {
	if !supportsBundledWebview() {
		return ""
	}
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	// 不走 EvalSymlinks：Windows 上应用目录很少有符号链接，而多一次解析就多一种
	// 在受限系统上失败的方式。
	return filepath.Join(filepath.Dir(exe), BundledWebviewDirName)
}

// validWebviewDir 校验一个目录是否真的是可用的 WebView2 运行时目录。
//
// 只认里面有没有 msedgewebview2.exe：Wails 把路径原样传给
// CreateCoreWebView2EnvironmentWithOptions 的 browserExecutableFolder，那边找不到
// 这个文件就直接创建失败，应用起不来只留一个看不懂的 HRESULT。宁可在这里退回系统
// 内核，也不要把一个空目录递过去。
func validWebviewDir(dir string) string {
	if dir == "" {
		return ""
	}
	if _, err := os.Stat(filepath.Join(dir, bundledWebviewExeName)); err != nil {
		return ""
	}
	return dir
}

// versionDirPattern 匹配形如 132.0.2957.140 的版本号目录名。
var versionDirPattern = regexp.MustCompile(`^\d+(\.\d+){2,3}$`)

// versionFromRuntimeDir 从运行时目录结构里推断版本号。
//
// Fixed Version 运行时沿用 Edge 自身的布局：msedgewebview2.exe 旁边有一个以版本号
// 命名的子目录。这是在不调用任何 Windows API 的前提下最省事的读法，也是
// 文件版本信息读不出来时的兜底。取不到返回空字符串。
func versionFromRuntimeDir(dir string) string {
	if dir == "" {
		return ""
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}
	// 正常情况下只会有一个版本目录；真有多个（手工拷错、覆盖解压过）时取版本号最大
	// 的那个，至少每次启动显示的是同一个结果。
	var best string
	for _, e := range entries {
		if !e.IsDir() || !versionDirPattern.MatchString(e.Name()) {
			continue
		}
		if best == "" || versionLess(best, e.Name()) {
			best = e.Name()
		}
	}
	return best
}

// versionLess 比较两个点分版本号，a < b 时返回 true。
// 按段做数值比较，不能用字符串比较：那样 "99" 会大于 "132"。
func versionLess(a, b string) bool {
	as, bs := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(as) || i < len(bs); i++ {
		av, bv := segment(as, i), segment(bs, i)
		if av != bv {
			return av < bv
		}
	}
	return false
}

// segment 取版本号的第 i 段并转成整数，越界或解析失败按 0 处理。
func segment(parts []string, i int) int {
	if i >= len(parts) {
		return 0
	}
	n, err := strconv.Atoi(parts[i])
	if err != nil {
		return 0
	}
	return n
}

// joinVersion 把若干段数字拼成点分版本号。
func joinVersion(parts ...uint32) string {
	segments := make([]string, len(parts))
	for i, p := range parts {
		segments[i] = strconv.FormatUint(uint64(p), 10)
	}
	return strings.Join(segments, ".")
}
