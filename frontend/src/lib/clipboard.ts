// 剪贴板写入。
//
// WKWebView 对 navigator.clipboard.writeText 有「用户手势」限制：手势一旦过期
// （例如复制 cURL 需要先 await 一次后端调用），写入就会抛 NotAllowedError。
// 因此优先走 Wails 原生剪贴板（由 Go 侧执行，不受手势限制），
// 仅在原生调用不可用时（如纯浏览器调试）回退到 navigator.clipboard。
import { Clipboard } from "@wailsio/runtime"

/** 把文本写入系统剪贴板，失败时抛出错误交由调用方提示 */
export async function copyText(text: string): Promise<void> {
  try {
    await Clipboard.SetText(text)
    return
  } catch {
    // 原生剪贴板不可用，尝试浏览器 API
  }
  await navigator.clipboard.writeText(text)
}
