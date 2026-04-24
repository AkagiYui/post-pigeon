// Select 下拉选择组件
import { createSignal, For, type JSX, Show, splitProps } from "solid-js"

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
  size?: "sm" | "default"
  /** 是否可搜索 */
  searchable?: boolean
  /** 是否隐藏下拉箭头 */
  hideChevron?: boolean
}

const sizeClasses = {
  sm: "h-7 text-xs px-2",
  default: "h-8 text-sm px-3",
}

/**
 * Select 下拉选择组件
 */
export function Select(props: SelectProps) {
  const [local] = splitProps(props, ["options", "value", "onChange", "placeholder", "class", "disabled", "size", "searchable", "hideChevron"])
  const [open, setOpen] = createSignal(false)

  const currentLabel = () => {
    const opt = local.options.find(o => o.value === local.value)
    return opt?.label || local.placeholder || ""
  }

  return (
    <div class={cn("relative", local.class)}>
      <button
        class={cn(
          "flex items-center justify-between w-full rounded-md border border-border bg-input text-foreground",
          "transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          sizeClasses[local.size || "default"],
        )}
        onClick={() => !local.disabled && setOpen(!open())}
        disabled={local.disabled}
      >
        <span class={cn("whitespace-nowrap", !local.value && "text-muted-foreground")}>
          {currentLabel()}
        </span>
        <Show when={!local.hideChevron}>
          <svg class="h-3.5 w-3.5 shrink-0 ml-1 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Show>
      </button>

      <Show when={open()}>
        <>
          <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div class="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto">
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
        </>
      </Show>
    </div>
  )
}
