//go:build windows

package platform

import (
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows/registry"
)

// bundledWebviewExeName 是 WebView2 运行时的宿主进程名。
// browserExecutableFolder 指过去的目录里必须有它，否则环境创建直接失败。
const bundledWebviewExeName = "msedgewebview2.exe"

// supportsBundledWebview 只有 Windows 支持随包分发内核。
func supportsBundledWebview() bool { return true }

// webView2ClientKey 是 WebView2 Evergreen 运行时在 EdgeUpdate 下的注册表键。
// 这个 GUID 是微软文档里公开的固定值，用来区分 WebView2 与 Edge 浏览器本体。
const webView2ClientKey = `Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`

// webviewInfo 读取 Windows 上的内核信息。
func webviewInfo() WebviewInfo {
	info := WebviewInfo{Engine: "WebView2"}

	if dir := BundledWebviewPath(); dir != "" {
		// 先读 exe 的文件版本信息，这是与目录结构无关的权威来源；
		// 读不到（受限系统上 version.dll 被精简掉过）再退回目录名推断。
		info.Version = fileVersion(filepath.Join(dir, bundledWebviewExeName))
		if info.Version == "" {
			info.Version = versionFromRuntimeDir(dir)
		}
		return info
	}

	info.Version = systemWebviewVersion()
	return info
}

// systemWebviewVersion 从注册表读取系统安装的 WebView2 Evergreen 运行时版本。
// 没装（或只装了预览通道）时返回空字符串。
func systemWebviewVersion() string {
	// 三个位置都要查：64 位系统上运行时装在 WOW6432Node 下（EdgeUpdate 是 32 位
	// 程序），32 位系统在 SOFTWARE 下，而「仅为当前用户安装」的那份在 HKCU 下——
	// 网吧和公司内网机器上后者相当常见，漏掉就会误报成「未安装」。
	candidates := []struct {
		root registry.Key
		path string
	}{
		{registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\` + webView2ClientKey},
		{registry.LOCAL_MACHINE, `SOFTWARE\` + webView2ClientKey},
		{registry.CURRENT_USER, `SOFTWARE\` + webView2ClientKey},
	}

	for _, c := range candidates {
		key, err := registry.OpenKey(c.root, c.path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		version, _, err := key.GetStringValue("pv")
		_ = key.Close()
		// EdgeUpdate 会给「登记过但没实际安装」的产品留一个 0.0.0.0，
		// 那不算装上了。
		if err == nil && version != "" && version != "0.0.0.0" {
			return version
		}
	}
	return ""
}

// vsFixedFileInfo 对应 Win32 的 VS_FIXEDFILEINFO 结构体，
// 只用得到前几个字段，但必须完整声明才能保证偏移正确。
type vsFixedFileInfo struct {
	Signature        uint32
	StrucVersion     uint32
	FileVersionMS    uint32
	FileVersionLS    uint32
	ProductVersionMS uint32
	ProductVersionLS uint32
	FileFlagsMask    uint32
	FileFlags        uint32
	FileOS           uint32
	FileType         uint32
	FileSubtype      uint32
	FileDateMS       uint32
	FileDateLS       uint32
}

// version.dll 的三个函数。用 LazyDLL 与本包既有做法保持一致：
// 精简版系统上真把 version.dll 删了的话，调用会失败而不是加载期崩溃。
var (
	versionDLL                 = syscall.NewLazyDLL("version.dll")
	procGetFileVersionInfoSize = versionDLL.NewProc("GetFileVersionInfoSizeW")
	procGetFileVersionInfo     = versionDLL.NewProc("GetFileVersionInfoW")
	procVerQueryValue          = versionDLL.NewProc("VerQueryValueW")
)

// fileVersion 读取一个 PE 文件的四段文件版本号，如 "132.0.2957.140"。
// 任何一步失败都返回空字符串，由调用方兜底——这只是展示用的信息，
// 不值得为它让应用起不来。
func fileVersion(path string) string {
	pathPtr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return ""
	}

	size, _, _ := procGetFileVersionInfoSize.Call(uintptr(unsafe.Pointer(pathPtr)), 0)
	if size == 0 {
		return ""
	}

	buf := make([]byte, size)
	ret, _, _ := procGetFileVersionInfo.Call(
		uintptr(unsafe.Pointer(pathPtr)), 0, size, uintptr(unsafe.Pointer(&buf[0])))
	if ret == 0 {
		return ""
	}

	subBlock, err := syscall.UTF16PtrFromString(`\`)
	if err != nil {
		return ""
	}
	var info *vsFixedFileInfo
	var infoLen uint32
	ret, _, _ = procVerQueryValue.Call(
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(subBlock)),
		uintptr(unsafe.Pointer(&info)),
		uintptr(unsafe.Pointer(&infoLen)))
	if ret == 0 || info == nil || infoLen == 0 {
		return ""
	}

	// info 指向 buf 内部，取完值之前不能让 buf 被回收。
	version := formatFileVersion(info.FileVersionMS, info.FileVersionLS)
	runtime.KeepAlive(buf)
	return version
}

// formatFileVersion 把 VS_FIXEDFILEINFO 里的两个 32 位字段拆成四段版本号。
// 高 16 位是大版本号，低 16 位是小版本号。
func formatFileVersion(ms, ls uint32) string {
	return joinVersion(ms>>16, ms&0xFFFF, ls>>16, ls&0xFFFF)
}
