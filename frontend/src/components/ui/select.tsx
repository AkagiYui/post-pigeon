// Select 下拉选择组件，封装 Ark UI Select
// Ark UI 基于 floating-ui 定位并 Portal 到 body（避免被祖先 overflow 裁剪），
// 提供键盘导航、type-ahead、外部点击关闭与完整 ARIA（role="listbox/option" 等）。
import { createListCollection, Select as ArkSelect } from "@ark-ui/solid/select"
import { createMemo, For, Show, splitProps } from "solid-js"
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
  /** 是否可搜索（保留以兼容既有调用；Ark UI Select 内置 type-ahead） */
  searchable?: boolean
  /** 是否隐藏下拉箭头 */
  hideChevron?: boolean
  /** 下拉触发器的无障碍名称 */
  "aria-label"?: string
}

const sizeClasses = {
  xs: "h-6 text-[11px] px-1.5",
  sm: "h-7 text-xs px-2",
  default: "h-8 text-sm px-3",
}

// Ark 把「空字符串」等同于「未选中」，于是 value:"" 的选项（如「无」「默认」）
// 既显示不出来、也选不回去。这里在与 Ark 通信时把 "" 映射成一个用户数据里不会出现的
// 哨兵值，出入口各转换一次，使空值成为一个正常可选项。
const EMPTY_SENTINEL = "\u0000__empty__"
const toArkValue = (value: string) => (value === "" ? EMPTY_SENTINEL : value)
const fromArkValue = (value: string) => (value === EMPTY_SENTINEL ? "" : value)

const textSizeClasses = {
  xs: "text-[11px]",
  sm: "text-xs",
  default: "text-sm",
}

/**
 * Select 下拉选择组件
 */
export function Select(props: SelectProps) {
  const [local] = splitProps(props, ["options", "value", "onChange", "placeholder", "class", "disabled", "size", "textSize", "searchable", "hideChevron", "aria-label"])

  const sizeCls = () => sizeClasses[local.size || "default"]
  const textSizeCls = () => textSizeClasses[local.textSize || local.size || "default"]

  // 当前语言下的实时标签（options 的 label 会随 i18n 变化）
  const liveLabel = (rawArkValue: string) => {
    const value = fromArkValue(rawArkValue)
    return local.options.find(o => o.value === value)?.label ?? value
  }

  /** 当前值对应的 Ark 选中数组；值不在选项里时返回空数组以展示 placeholder */
  const selectedArkValue = () => local.options.some(o => o.value === local.value) ? [toArkValue(local.value)] : []

  // 稳定的 collection：仅当「值集合」（value + disabled）变化时才重建。
  // 父组件常在每次渲染重建 options（例如标签随 i18n 变化 → 全新对象数组），若据此重建
  // collection 会扰动 Ark 内部选择同步、可能回吐 onValueChange 覆盖用户选择；冻结引用即可规避。
  // itemToString 读取实时 options，因此展示标签仍随语言更新。
  let cacheKey = ""
  let cached = createListCollection<SelectOption>({ items: [] })
  const collection = createMemo(() => {
    const opts = local.options
    const key = opts.map(o => `${o.value}:${o.disabled ? 1 : 0}`).join(" ")
    if (key !== cacheKey) {
      cacheKey = key
      cached = createListCollection<SelectOption>({
        items: opts.map(o => ({ ...o, value: toArkValue(o.value) })),
        itemToValue: (item) => item.value,
        itemToString: (item) => liveLabel(item.value),
        isItemDisabled: (item) => !!item.disabled,
      })
    }
    return cached
  })

  return (
    <div class={cn("relative", local.class)}>
      <ArkSelect.Root
        collection={collection()}
        value={selectedArkValue()}
        // 仅在值真正变化时上抛，作为对残余回吐的二次防护
        onValueChange={(details) => {
          if (details.value.length === 0) return
          const v = fromArkValue(details.value[0])
          if (v !== local.value) local.onChange(v)
        }}
        disabled={local.disabled}
        positioning={{ placement: "bottom", gutter: 4, sameWidth: true }}
      >
        <ArkSelect.Control>
          <ArkSelect.Trigger
            aria-label={local["aria-label"]}
            class={cn(
              "flex items-center justify-between w-full rounded-md border border-border bg-input text-foreground",
              "transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              "disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder-shown]:text-muted-foreground",
              sizeCls(),
            )}
          >
            <ArkSelect.ValueText
              placeholder={local.placeholder}
              class={cn("whitespace-nowrap truncate text-left", textSizeCls())}
            />
            <Show when={!local.hideChevron}>
              <ArkSelect.Indicator class="shrink-0 ml-1">
                <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </ArkSelect.Indicator>
            </Show>
          </ArkSelect.Trigger>
        </ArkSelect.Control>
        <Portal>
          <ArkSelect.Positioner>
            <ArkSelect.Content class="anim-pop z-[101] bg-popover border border-border rounded-md shadow-xl overflow-y-auto max-h-60 p-0 focus-visible:outline-none">
              <For each={collection().items}>
                {(item) => (
                  <ArkSelect.Item
                    item={item}
                    class={cn(
                      "flex items-center px-3 py-1.5 text-sm cursor-pointer transition-colors select-none outline-none",
                      "text-foreground data-[highlighted]:bg-muted",
                      "data-[state=checked]:bg-accent-muted data-[state=checked]:text-accent",
                      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
                    )}
                  >
                    <ArkSelect.ItemText>{liveLabel(item.value)}</ArkSelect.ItemText>
                  </ArkSelect.Item>
                )}
              </For>
            </ArkSelect.Content>
          </ArkSelect.Positioner>
        </Portal>
      </ArkSelect.Root>
    </div>
  )
}
