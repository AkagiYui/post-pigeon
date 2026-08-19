// 全局轻提示（toast）状态。
//
// 此前所有失败路径都只 console.error，用户侧完全静默——保存失败、导入失败、
// 请求失败都表现为「点了没反应」。这里提供统一的反馈出口，由 <Toaster /> 渲染。
import { createRoot, createSignal } from "solid-js"

import { errorMessage, isCanceled } from "@/lib/errors"

export type ToastKind = "success" | "error" | "warning" | "info"

export interface Toast {
  id: number
  kind: ToastKind
  /** 主文案 */
  message: string
  /** 可展开的详情（通常是后端原始错误），用于排查 */
  detail?: string
  /** 自动关闭毫秒数；0 表示不自动关闭 */
  duration: number
}

/** 单条提示的默认存活时长（毫秒），错误类更长以便读完 */
const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 2500,
  info: 3000,
  warning: 5000,
  error: 8000,
}

/** 同时展示的最大条数，超出时挤掉最旧的 */
const MAX_TOASTS = 5

const [toasts, setToasts] = createRoot(() => {
  const [get, set] = createSignal<Toast[]>([])
  return [get, set] as const
})

export { toasts }

let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/** 关闭一条提示 */
export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  setToasts((prev) => prev.filter((item) => item.id !== id))
}

/** 关闭全部提示 */
export function dismissAllToasts() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  setToasts([])
}

interface ToastOptions {
  detail?: string
  duration?: number
}

/** 推入一条提示，返回其 id */
export function showToast(kind: ToastKind, message: string, options: ToastOptions = {}): number {
  const id = nextId++
  const duration = options.duration ?? DEFAULT_DURATION[kind]
  const toast: Toast = { id, kind, message, detail: options.detail, duration }

  setToasts((prev) => {
    const next = [...prev, toast]
    // 超出上限时丢弃最旧的（连同其定时器）
    while (next.length > MAX_TOASTS) {
      const dropped = next.shift()
      if (dropped) {
        const timer = timers.get(dropped.id)
        if (timer !== undefined) {
          clearTimeout(timer)
          timers.delete(dropped.id)
        }
      }
    }
    return next
  })

  if (duration > 0) {
    timers.set(id, setTimeout(() => dismissToast(id), duration))
  }
  return id
}

export const toastSuccess = (message: string, options?: ToastOptions) => showToast("success", message, options)
export const toastInfo = (message: string, options?: ToastOptions) => showToast("info", message, options)
export const toastWarning = (message: string, options?: ToastOptions) => showToast("warning", message, options)

/**
 * 展示一条错误提示。
 *
 * 统一在这里做三件事：把后端结构化错误翻成本地化文案、把原始错误留在详情里、
 * 同时打一条 console.error 便于开发时排查。用户主动取消的请求会被静默忽略。
 */
export function toastError(error: unknown, fallbackKey?: string): number | null {
  if (isCanceled(error)) return null
  console.error(fallbackKey ?? "操作失败", error)

  const message = errorMessage(error, fallbackKey)
  const raw = error instanceof Error ? error.message : String(error ?? "")
  // 详情与主文案相同就没必要重复展示
  const detail = raw && raw !== message ? raw : undefined
  return showToast("error", message, { detail })
}
