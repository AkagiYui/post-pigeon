// Input 输入框基础组件
import { createRenderEffect, type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  /** 输入框尺寸 */
  size?: "sm" | "default" | "lg"
  /** 是否有错误状态 */
  error?: boolean
}

/** 输入框尺寸样式映射 */
const sizeClasses = {
  sm: "h-7 text-xs px-2",
  default: "h-8 text-sm px-3",
  lg: "h-10 text-base px-4",
}

/**
 * 受控 value 绑定：仅当 DOM 实际值与目标值不同才写回。
 *
 * Solid 默认的 `value={...}` 只与「上一次响应式值」比较，用户每敲一个字符都会把
 * 已经等于当前 DOM 的字符串再次赋给 el.value。在 WKWebView（Wails 打包后运行环境）里，
 * 对聚焦中的输入框做这种冗余赋值会打断输入/丢失焦点（表现为「输入一个字符后需重新点击」）。
 * 这里改为与 el.value 比较后再写，跳过冗余赋值即可规避；对外部程序化改值仍然生效。
 */
function bindControlledValue(el: HTMLInputElement | HTMLTextAreaElement, get: () => unknown) {
  createRenderEffect(() => {
    const raw = get()
    if (raw === undefined) return // 非受控（未传 value）：不接管
    const next = raw === null ? "" : String(raw)
    if (el.value !== next) el.value = next
  })
}

/**
 * Input 输入框组件
 */
export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["class", "size", "error", "value"])

  return (
    <input
      ref={(el) => bindControlledValue(el, () => local.value)}
      class={cn(
        "w-full rounded-md border bg-input text-foreground placeholder:text-muted-foreground",
        "transition-colors hover:border-control-border focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[local.size || "default"],
        local.error ? "border-red-500" : "border-border",
        local.class,
      )}
      {...rest}
    />
  )
}

/**
 * Textarea 多行文本输入组件
 */
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["class", "error", "value"])

  return (
    <textarea
      ref={(el) => bindControlledValue(el, () => local.value)}
      class={cn(
        "w-full rounded-md border bg-input text-foreground placeholder:text-muted-foreground",
        "transition-colors hover:border-control-border focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50 min-h-20 px-3 py-2 text-sm",
        local.error ? "border-red-500" : "border-border",
        local.class,
      )}
      {...rest}
    />
  )
}
