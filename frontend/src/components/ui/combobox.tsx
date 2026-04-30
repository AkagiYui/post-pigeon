// Combobox 可搜索/可自定义输入的下拉选择组件
// 支持从预设选项中搜索筛选，也支持用户输入自定义值
//
// 交互模式：显示态 → 编辑态
// - 显示态：纯展示当前值，点击进入编辑态
// - 编辑态：弹出空白输入框 + 下拉列表，输入内容实时筛选
// - Enter 确认，Escape/失焦 放弃变更
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  /** 选项值 */
  value: string
  /** 选项标签 */
  label: string
  /** 是否禁用 */
  disabled?: boolean
}

export interface ComboboxProps {
  /** 预设选项列表 */
  options: ComboboxOption[]
  /** 当前值 */
  value: string
  /** 值变更回调（用户确认选择或输入时触发） */
  onChange: (value: string) => void
  /** 自定义类名 */
  class?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 占位文字（编辑态输入框的 placeholder） */
  placeholder?: string
  /** 自定义输入选项的标签模板 */
  customLabel?: (value: string) => string
  /** 组件最小宽度 */
  minWidth?: string
  /** 显示态的自定义渲染类名（用于外部自定义颜色等样式） */
  displayClass?: string
}

/**
 * Combobox 可搜索/可自定义输入的下拉选择组件
 *
 * 交互行为：
 * - 显示态：纯展示当前值，点击进入编辑态
 * - 编辑态：弹出空白输入框 + 下拉选项列表
 * - 输入内容实时筛选下拉选项
 * - 回车确认当前输入（自定义值会大写化）
 * - Escape 放弃变更，恢复原始值
 * - 失焦放弃变更，恢复原始值
 * - 点击下拉选项确认选择
 */
export function Combobox(props: ComboboxProps) {
  const [editing, setEditing] = createSignal(false)
  const [inputValue, setInputValue] = createSignal("")
  let inputRef: HTMLInputElement | undefined

  // 当外部 value 变化时，如果在编辑态则退出编辑态（例如端点切换）
  createEffect(() => {
    props.value
    setEditing(false)
    setInputValue("")
  })

  // 根据输入内容筛选预设选项（大小写不敏感）
  const filteredOptions = () => {
    const query = inputValue().toLowerCase().trim()
    if (!query) return props.options
    return props.options.filter(opt =>
      opt.value.toLowerCase().includes(query)
      || opt.label.toLowerCase().includes(query),
    )
  }

  // 判断当前输入是否匹配某个预设选项（大小写不敏感精确匹配）
  const isExactMatch = () => {
    const query = inputValue().trim().toUpperCase()
    return props.options.some(opt => opt.value === query)
  }

  // 确认选择：将值通知父组件并退出编辑态
  const confirm = (value: string) => {
    const trimmed = value.trim()
    if (trimmed) {
      props.onChange(trimmed.toUpperCase())
    }
    setEditing(false)
    setInputValue("")
  }

  // 放弃变更：退出编辑态
  const cancel = () => {
    setEditing(false)
    setInputValue("")
  }

  // 进入编辑态：清空输入框并自动聚焦
  const startEditing = () => {
    if (props.disabled) return
    setEditing(true)
    setInputValue("")
    // 等待 DOM 更新后聚焦输入框
    queueMicrotask(() => {
      inputRef?.focus()
      debugger
    })
  }

  const handleInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement
    setInputValue(target.value)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const val = inputValue().trim()
      if (val) {
        confirm(val)
      } else {
        // 输入为空时，Enter 退出编辑态但不修改值
        cancel()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancel()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      // 聚焦到下拉列表的第一个可选项
      const container = (e.currentTarget as HTMLElement)
        .closest(".combobox-root")
        ?.querySelector(".combobox-listbox")
      const firstItem = container?.querySelector("[data-combobox-option]:not([disabled])") as HTMLElement | null
      firstItem?.focus()
    }
  }

  const handleBlur = (e: FocusEvent) => {
    // 如果焦点移到了下拉列表中的选项，不算失焦
    const related = e.relatedTarget as HTMLElement | null
    if (related?.closest(".combobox-root") === (e.currentTarget as HTMLElement).closest(".combobox-root")) {
      return
    }
    cancel()
  }

  // 点击外部关闭
  createEffect(() => {
    if (editing()) {
      const handler = (e: MouseEvent) => {
        const root = inputRef?.closest(".combobox-root")
        if (root && !root.contains(e.target as Node)) {
          cancel()
        }
      }
      document.addEventListener("mousedown", handler)
      onCleanup(() => document.removeEventListener("mousedown", handler))
    }
  })

  return (
    <div
      class={cn("combobox-root relative", props.class)}
      style={{ "min-width": props.minWidth ?? "80px" }}
    >
      {/* 隐藏标尺：始终存在，以当前值撑住容器宽度，保证编辑态和显示态宽度一致 */}
      <span
        class="invisible absolute text-xs font-bold uppercase px-2 whitespace-nowrap"
        aria-hidden="true"
      >
        {props.value}
      </span>

      {/* 显示态：纯展示当前值 */}
      <Show when={!editing()}>
        <button
          class={cn(
            "w-full h-full flex items-center px-2 text-xs font-bold uppercase whitespace-nowrap",
            "cursor-pointer select-none rounded-md transition-colors",
            props.displayClass,
          )}
          onClick={startEditing}
          disabled={props.disabled}
          type="button"
        >
          {props.value}
        </button>
      </Show>

      {/* 编辑态：绝对定位的输入框（底层保留原始值作为幽灵文字） + 下拉列表 */}
      <Show when={editing()}>
        <div class="absolute inset-0 z-20">
          {/* 幽灵文字：输入为空时显示原始值，输入内容后隐藏 */}
          <Show when={!inputValue()}>
            <div
              class={cn(
                "absolute inset-0 flex items-center px-2 text-xs font-bold uppercase whitespace-nowrap pointer-events-none",
                props.displayClass,
                "opacity-40",
              )}
              aria-hidden="true"
            >
              {props.value}
            </div>
          </Show>

          {/* 透明输入框 */}
          <input
            ref={inputRef}
            type="text"
            class={cn(
              "w-full h-full rounded-md bg-transparent text-foreground",
              "focus-visible:outline-none",
              "text-xs px-2 font-bold uppercase",
              "relative z-10",
            )}
            value={inputValue()}
            onInput={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder}
          />
        </div>

        {/* 下拉菜单 */}
        <div class="absolute top-full left-0 z-50 mt-0.5 bg-surface border border-border rounded-md shadow-lg overflow-hidden min-w-28">
          <div class="combobox-listbox max-h-60 overflow-y-auto" role="listbox">
            {/* 自定义选项：输入不匹配预设时显示 */}
            <Show when={inputValue().trim() && !isExactMatch()}>
              <div
                role="option"
                data-combobox-option
                class={cn(
                  "px-3 py-1.5 text-xs cursor-pointer transition-colors select-none",
                  "text-foreground hover:bg-muted",
                )}
                tabIndex={-1}
                onClick={() => confirm(inputValue())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    confirm(inputValue())
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    cancel()
                  }
                }}
              >
                <span class="font-bold text-gray-600 dark:text-gray-400">
                  {props.customLabel
                    ? props.customLabel(inputValue().trim().toUpperCase())
                    : inputValue().trim().toUpperCase()}
                </span>
              </div>
            </Show>

            {/* 筛选后的预设选项 */}
            <For each={filteredOptions()}>
              {(option) => (
                <div
                  role="option"
                  data-combobox-option
                  aria-selected={option.value === props.value}
                  class={cn(
                    "px-3 py-1.5 text-xs cursor-pointer transition-colors select-none",
                    option.value === props.value
                      ? "bg-accent-muted text-accent"
                      : "text-foreground hover:bg-muted",
                    option.disabled && "opacity-50 cursor-not-allowed",
                  )}
                  tabIndex={-1}
                  onClick={() => {
                    if (!option.disabled) {
                      confirm(option.value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (!option.disabled) confirm(option.value)
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      cancel()
                    }
                  }}
                >
                  <span class="font-bold">{option.label}</span>
                </div>
              )}
            </For>

            {/* 无匹配结果 */}
            <Show when={filteredOptions().length === 0 && !inputValue().trim()}>
              <div class="px-3 py-2 text-xs text-muted-foreground select-none">
                无匹配选项
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
