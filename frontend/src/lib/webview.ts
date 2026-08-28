/**
 * 浏览器内核信息的前端侧补充。
 *
 * Go 侧能给出内核名称、来源（内置 / 系统）与运行时目录，但版本号只有 Windows 上
 * 读得到：macOS 的 WKWebView 要翻框架 plist，Linux 的 WebKitGTK 要问包管理器，
 * 都没有可靠的跨发行版读法。而前端本来就跑在这个内核里，navigator.userAgent 里的
 * 版本号既准确又零成本，正好补上这一块。
 */

/**
 * 从 User-Agent 里解析出渲染引擎的版本号，解析不出返回空字符串。
 *
 * 三种形态按可信度排序：
 *   1. Chrome/<ver> —— WebView2 与所有 Chromium 内核，这是最贴近实际渲染行为的版本
 *   2. Version/<ver> —— Safari / WKWebView 报告的 Safari 版本，比 AppleWebKit 号好懂
 *   3. AppleWebKit/<ver> —— WebKitGTK 等没有 Version/ 段时的兜底
 */
export function engineVersionFromUserAgent(userAgent: string): string {
  const patterns = [/Chrome\/([\d.]+)/, /Version\/([\d.]+)/, /AppleWebKit\/([\d.]+)/]
  for (const pattern of patterns) {
    const matched = userAgent.match(pattern)
    if (matched) return matched[1]
  }
  return ""
}

/**
 * 读取当前运行环境的 User-Agent。
 *
 * 单测在 jsdom 下跑、服务端模式没有 navigator，都要能安全返回空串而不是抛异常。
 */
export function currentUserAgent(): string {
  if (typeof navigator === "undefined") return ""
  return navigator.userAgent ?? ""
}
