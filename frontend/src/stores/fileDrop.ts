// 原生文件拖放：把系统拖进窗口的文件转成前端可订阅的事件。
//
// 为什么不能只用 HTML5 的 drop 事件：WebView 默认不把外部文件交给页面，
// macOS 上 Wails 更是用一层原生 NSView 把拖放整个截走，页面的 drop 根本不触发。
// 开启 EnableFileDrop 后，Wails 的链路是「原生层拿路径 → 运行时按落点找到最近的
// data-file-drop-target 元素 → 回传 Go → main.go 的 registerFileDrop 转发成本事件」。
//
// 拿到的只有路径，没有 File 对象；要正文得再调后端读（如
// ImportExportService.ReadImportDocument）。
import { Events } from "@wailsio/runtime"

/** 与 main.go 的 FileDropEventName 保持一致 */
const FILE_DROP_EVENT = "files:dropped"

/** 与 main.go 的 FileDropPayload 保持一致 */
interface FileDropPayload {
  paths: string[]
  /** 落点元素的 data-drop-zone 属性，用来区分页面上的多个拖放区 */
  zone: string
}

type DropHandler = (paths: string[]) => void

const handlers = new Map<string, Set<DropHandler>>()

/**
 * 当前是否跑在 Wails 里（浏览器里 window._wails 不存在）。
 *
 * 拖放区据此二选一：在应用里交给原生链路，在浏览器里退回 HTML5 drop 事件。
 * 两条同时生效会导致同一次拖放被处理两遍（Windows 上两条都会触发）。
 */
export function nativeFileDropAvailable(): boolean {
  return typeof window !== "undefined" && !!(window as { _wails?: unknown })._wails
}

/**
 * 订阅某个拖放区的文件拖放，返回取消订阅的函数。
 *
 * zone 需与元素上的 data-drop-zone 属性一致，且该元素还要带 data-file-drop-target
 * ——后者是 Wails 运行时用来判定「这里能放」的标记。
 */
export function onFilesDropped(zone: string, handler: DropHandler): () => void {
  let set = handlers.get(zone)
  if (!set) {
    set = new Set()
    handlers.set(zone, set)
  }
  set.add(handler)
  return () => {
    const current = handlers.get(zone)
    if (!current) return
    current.delete(handler)
    if (current.size === 0) handlers.delete(zone)
  }
}

function dispatch(payload: FileDropPayload | undefined) {
  if (!payload?.paths?.length) return
  const set = handlers.get(payload.zone)
  if (!set) return // 拖到了没人认领的区域，忽略
  for (const handler of set) handler(payload.paths)
}

// 模块级订阅一次。与 stores/stream.ts 同理，这里在 Toaster 渲染前就会执行，
// 出错只能写 console。
if (typeof window !== "undefined") {
  try {
    Events.On(FILE_DROP_EVENT, (e: { data?: FileDropPayload }) => dispatch(e?.data))
  } catch (err) {
    console.error("订阅文件拖放事件失败", err)
  }
}
