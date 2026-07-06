// Select 下拉选择组件，封装 Kobalte Select
// Kobalte 基于 floating-ui 定位并 Portal 到 body（避免被祖先 overflow 裁剪），
// 提供键盘导航、type-ahead、外部点击关闭与完整 ARIA（role="listbox/option" 等）。
import { Select as KSelect } from "@kobalte/core/select"
import { type JSX, Show, splitProps } from "solid-js"

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
  /** 是否可搜索（保留以兼容既有调用；Kobalte Select 内置 type-ahead） */
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

  const sizeCls = () => sizeClasses[local.size || "default"]
  const textSizeCls = () => textSizeClasses[local.textSize || local.size || "default"]
  const selected = () => local.options.find(o => o.value === local.value) ?? null

  return (
    <div class={cn("relative", local.class)}>
      <KSelect<SelectOption>
        options={local.options}
        optionValue="value"
        optionTextValue="label"
        optionDisabled="disabled"
        value={selected()}
        onChange={(opt) => { if (opt) local.onChange(opt.value) }}
        placeholder={local.placeholder}
        disabled={local.disabled}
        gutter={4}
        sameWidth
        itemComponent={(itemProps) => (
          <KSelect.Item
            item={itemProps.item}
            class={cn(
              "flex items-center px-3 py-1.5 text-sm cursor-pointer transition-colors select-none outline-none",
              "text-foreground data-[highlighted]:bg-muted",
              "data-[selected]:bg-accent-muted data-[selected]:text-accent",
              "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
            )}
          >
            <KSelect.ItemLabel>{itemProps.item.rawValue.label}</KSelect.ItemLabel>
          </KSelect.Item>
        )}
      >
        <KSelect.Trigger
          class={cn(
            "flex items-center justify-between w-full rounded-md border border-border bg-input text-foreground",
            "transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder-shown]:text-muted-foreground",
            sizeCls(),
          )}
        >
          <KSelect.Value<SelectOption> class={cn("whitespace-nowrap truncate text-left", textSizeCls())}>
            {(state) => state.selectedOption()?.label}
          </KSelect.Value>
          <Show when={!local.hideChevron}>
            <KSelect.Icon class="shrink-0 ml-1">
              <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </KSelect.Icon>
          </Show>
        </KSelect.Trigger>
        <KSelect.Portal>
          <KSelect.Content class="z-[101] bg-surface border border-border rounded-md shadow-lg overflow-hidden">
            <KSelect.Listbox class="overflow-y-auto max-h-60 p-0 focus-visible:outline-none" />
          </KSelect.Content>
        </KSelect.Portal>
      </KSelect>
    </div>
  )
}
