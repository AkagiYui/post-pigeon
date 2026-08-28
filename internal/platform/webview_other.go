//go:build !windows

package platform

import "runtime"

// bundledWebviewExeName 在非 Windows 上用不到，声明出来只是为了让
// validWebviewDir 这类共用代码不必再加一层平台分支。
const bundledWebviewExeName = "msedgewebview2.exe"

// supportsBundledWebview 非 Windows 平台没有随包分发内核这一说：
// macOS 的 WKWebView 与 Linux 的 WebKitGTK 都是系统组件，不能拷进应用目录里。
func supportsBundledWebview() bool { return false }

// webviewInfo 读取非 Windows 平台的内核信息。
//
// 这里只给出内核名称，版本留空：WebKit 的版本号没有一个跨发行版可靠的读法
// （macOS 要翻框架的 plist，Linux 要问包管理器），而前端本来就跑在这个内核里，
// 从 navigator.userAgent 拿到的版本更准也更省事。前端会用它兜底。
func webviewInfo() WebviewInfo {
	switch runtime.GOOS {
	case "darwin", "ios":
		return WebviewInfo{Engine: "WKWebView"}
	case "android":
		return WebviewInfo{Engine: "Android WebView"}
	default:
		return WebviewInfo{Engine: "WebKitGTK"}
	}
}
