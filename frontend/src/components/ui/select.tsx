// Select 下拉选择组件
// 下拉面板通过 Portal 渲染到 body 并使用 fixed 定位，避免被祖先的 overflow 容器裁剪。
import { createEffect, createSignal, For, onCleanup, Show, splitProps } from "solid-js"
import { Portal } from "solid-js/web"

import { cn } from "@/lib/utils"

export interface SelectOption {
  /** 选项值 */
  value: string
  /** 选项标签 */
  label: string
  /** 是否禁用 */
  disabled?: boolean
}

export interface SelectProps {
  /** 选项列表 */
  options: SelectOption[]
  /** 当前值 */
  value: string
  /** 变更回调 */
  onChange: (value: string) => void
  /** 占位文字 */
  placeholder?: string
  /** 自定义类名 */
  class?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 尺寸 */
  size?: "xs" | "sm" | "default"
  /** 独立字体大小，不传则跟随 size */
  textSize?: "xs" | "sm" | "default"
  /** 是否可搜索 */
  searchable?: boolean
  /** 是否隐藏下拉箭头 */
  hideChevron?: boolean
}

const sizeClasses = {
  xs: "h-6 text-[11px] px-1.5",
  sm: "h-7 text-xs px-2",
  default: "h-8 text-sm px-3",
}

const textSizeClasses = {
  xs: "text-[11px]",
  sm: "text-xs",
  default: "text-sm",
}

/**
 * Select 下拉选择组件
 */
export function Select(props: SelectProps) {
  const [local] = splitProps(props, ["options", "value", "onChange", "placeholder", "class", "disabled", "size", "textSize", "searchable", "hideChevron"])
  const [open, setOpen] = createSignal(false)
  // 下拉面板定位（基于 trigger 元素，fixed 坐标）
  const [pos, setPos] = createSignal({ left: 0, top: 0, width: 0, above: false })
  let triggerRef: HTMLButtonElement | undefined

  // 当前选中项的按钮尺寸类
  const sizeCls = () => sizeClasses[local.size || "default"]
  // 仅字体大小类（给内部文本使用，避免 h-* / px-* 干扰布局；可独立于 size 设置）
  const textSizeCls = () => textSizeClasses[local.textSize || local.size || "default"]

  const currentLabel = () => {
    const opt = local.options.find(o => o.value === local.value)
    return opt?.label || local.placeholder || ""
  }

  // 依据 trigger 位置与可用空间计算下拉面板坐标；空间不足时向上弹出
  const updatePosition = () => {
    if (!triggerRef) return
    const rect = triggerRef.getBoundingClientRect()
    const estimated = Math.min(local.options.length * 32 + 8, 240)
    const below = window.innerHeight - rect.bottom
    const above = below < estimated && rect.top > below
    setPos({ left: rect.left, top: above ? rect.top : rect.bottom, width: rect.width, above })
  }

  const toggle = () => {
    if (local.disabled) return
    if (!open()) updatePosition()
    setOpen(!open())
  }

  // 打开时：监听滚动/尺寸变化以重定位，点击外部/Esc 关闭
  createEffect(() => {
    if (!open()) return
    const reposition = () => updatePosition()
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    onCleanup(() => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
      window.removeEventListener("keydown", onKey)
    })
  })

  return (
    <div class={cn("relative", local.class)}>
      <button
        ref={triggerRef}
        class={cn(
          "flex items-center justify-between w-full rounded-md border border-border bg-input text-foreground",
          "transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          sizeCls(),
        )}
        onClick={toggle}
        disabled={local.disabled}
      >
        <span class={cn("whitespace-nowrap truncate", !local.value && "text-muted-foreground", textSizeCls())}>
          {currentLabel()}
        </span>
        <Show when={!local.hideChevron}>
          <svg class="h-3.5 w-3.5 shrink-0 ml-1 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Show>
      </button>

      <Show when={open()}>
        <Portal>
          {/* 透明遮罩：点击关闭 */}
          <div class="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            class="fixed z-[101] bg-surface border border-border rounded-md shadow-lg overflow-y-auto max-h-60"
            style={{
              left: `${pos().left}px`,
              width: `${pos().width}px`,
              ...(pos().above
                ? { bottom: `${window.innerHeight - pos().top + 4}px` }
                : { top: `${pos().top + 4}px` }),
            }}
          >
            <For each={local.options}>
              {(option) => (
                <div
                  class={cn(
                    "px-3 py-1.5 text-sm cursor-pointer transition-colors select-none",
                    option.value === local.value
                      ? "bg-accent-muted text-accent"
                      : "text-foreground hover:bg-muted",
                    option.disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => {
                    if (!option.disabled) {
                      local.onChange(option.value)
                      setOpen(false)
                    }
                  }}
                >
                  {option.label}
                </div>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
