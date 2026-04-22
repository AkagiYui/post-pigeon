// 快捷键管理 Hook
import { onCleanup } from "solid-js"

type KeyHandler = (e: KeyboardEvent) => void

interface HotkeyConfig {
  /** 快捷键组合，如 "Ctrl+Enter" */
  key: string
  /** 回调函数 */
  handler: KeyHandler
  /** 是否在输入框中也触发 */
  allowInInput?: boolean
}

/** 解析快捷键字符串 */
function parseHotkey(hotkey: string): { key: string; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean } {
  const parts = hotkey.toLowerCase().split("+")
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes("ctrl") || parts.includes("cmdorctrl"),
    meta: parts.includes("cmd") || parts.includes("meta") || parts.includes("cmdorctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
  }
}

/** 匹配快捷键 */
function matchHotkey(e: KeyboardEvent, config: ReturnType<typeof parseHotkey>): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

  const keyMatch = e.key.toLowerCase() === config.key
  const ctrlMatch = isMac ? true : (e.ctrlKey === config.ctrl)
  const metaMatch = isMac ? (e.metaKey === config.meta || e.metaKey === config.ctrl) : true
  const shiftMatch = e.shiftKey === config.shift
  const altMatch = e.altKey === config.alt

  return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch
}

/**
 * 注册全局快捷键
 *
 * @example
 * ```tsx
 * useHotkey([
 *   { key: "CmdOrCtrl+Enter", handler: () => sendRequest() },
 *   { key: "CmdOrCtrl+S", handler: () => saveEndpoint() },
 * ])
 * ```
 */
export function useHotkey(configs: HotkeyConfig[]) {
  const parsed = configs.map(c => ({
    ...c,
    parsed: parseHotkey(c.key),
  }))

  const handler = (e: KeyboardEvent) => {
    // 检查是否在输入框中
    const target = e.target as HTMLElement
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

    for (const config of parsed) {
      if (matchHotkey(e, config.parsed)) {
        if (isInput && !config.allowInInput) continue
        e.preventDefault()
        config.handler(e)
        return
      }
    }
  }

  document.addEventListener("keydown", handler)
  onCleanup(() => document.removeEventListener("keydown", handler))
}
