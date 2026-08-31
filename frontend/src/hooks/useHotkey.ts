// 快捷键管理 Hook
import { onCleanup } from "solid-js"

type KeyHandler = (e: KeyboardEvent) => void

export interface HotkeyConfig {
  /** 快捷键组合，如 "Ctrl+Enter" */
  key: string
  /** 回调函数 */
  handler: KeyHandler
  /** 是否在输入框中也触发 */
  allowInInput?: boolean
  /** 每次按键时检查，不需要重新注册监听器 */
  enabled?: () => boolean
}

export interface HotkeyOptions {
  /** 由调用方控制作用域，例如工作区或设置对话框 */
  enabled?: () => boolean
}

/** 解析快捷键字符串 */
function parseHotkey(hotkey: string, isMac: boolean): { key: string; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean } {
  const parts = hotkey.toLowerCase().split("+").map(part => part.trim())
  const primary = parts.includes("cmdorctrl")
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes("ctrl") || parts.includes("control") || (primary && !isMac),
    meta: parts.includes("cmd") || parts.includes("command") || parts.includes("meta") || (primary && isMac),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
  }
}

/** 匹配快捷键 */
function matchHotkey(e: KeyboardEvent, config: ReturnType<typeof parseHotkey>): boolean {
  const keyMatch = e.key.toLowerCase() === config.key
  const ctrlMatch = e.ctrlKey === config.ctrl
  const metaMatch = e.metaKey === config.meta
  const shiftMatch = e.shiftKey === config.shift
  const altMatch = e.altKey === config.alt

  return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch
}

/** composedPath 同时兼容 SVG / Text / document 目标，以及编辑区域中的后代元素。 */
function isInputTarget(event: KeyboardEvent): boolean {
  const elements = event.composedPath().filter((node): node is Element => node instanceof Element)
  if (elements.some(node => node.tagName === "INPUT" || node.tagName === "TEXTAREA")) return true
  // 最近的有效 contenteditable 声明优先，false 可以在可编辑区域中建立非编辑子区域。
  for (const node of elements) {
    const editable = node.getAttribute("contenteditable")?.trim().toLowerCase()
    if (editable === "false") return false
    if (editable === "" || editable === "true" || editable === "plaintext-only") return true
  }
  return elements.some(node => node instanceof HTMLElement && node.isContentEditable)
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
export function useHotkey(configs: HotkeyConfig[], options: HotkeyOptions = {}) {
  const isMac = /mac/i.test(navigator.platform)
  const parsed = configs.map(c => ({
    config: c,
    parsed: parseHotkey(c.key, isMac),
  }))

  const handler = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || options.enabled?.() === false) return
    // 检查是否在输入框中
    const isInput = isInputTarget(e)

    for (const { config, parsed: binding } of parsed) {
      if (config.enabled?.() === false) continue
      if (matchHotkey(e, binding)) {
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
