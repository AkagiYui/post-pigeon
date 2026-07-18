// DropdownMenu 通用下拉菜单组件，封装 Ark UI Menu
// - trigger="click"（默认）→ Menu.Trigger：锚定触发元素，floating-ui 自动翻转
// - trigger="contextmenu" → Menu.ContextTrigger：在鼠标位置弹出
// 定位、视口翻转、外部点击关闭、ESC 逐级关闭、方向键导航与 ARIA 均由 Ark UI 处理。
// ContextMenu 右键菜单基于此组件封装。
import { Menu as ArkMenu } from "@ark-ui/solid/menu"
import { For, type JSX, Show } from "solid-js"
import { Portal } from "solid-js/web"

import { arkMerge } from "@/lib/ark"
import { cn } from "@/lib/utils"

/** 菜单项类型 */
export interface MenuItem {
  /** 菜单项唯一标识 */
  key: string
  /** 显示文字 */
  label: string
  /** 图标 */
  icon?: JSX.Element
  /** 快捷键提示 */
  accelerator?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否为分隔线 */
  separator?: boolean
  /** 子菜单 */
  children?: MenuItem[]
  /** 点击回调 */
  onClick?: () => void
}

export interface DropdownMenuProps {
  /** 触发元素（包裹的子元素） */
  children: JSX.Element
  /** 菜单项列表 */
  items: MenuItem[]
  /** 触发方式：click 点击触发，contextmenu 右键触发 */
  trigger?: "click" | "contextmenu"
  /** 定位策略：cursor 跟随触发点，anchor-bottom 基于触发元素底部居中 */
  placement?: "cursor" | "anchor-bottom"
  /** 自定义类名 */
  class?: string
}

/** 菜单面板通用样式（Apifox：8px 圆角、柔和大投影、上下 4px 内边距、slide-up 弹出动画） */
const CONTENT_CLASS = "anim-pop z-50 min-w-45 max-h-[80vh] overflow-y-auto bg-popover border border-border rounded-md shadow-xl py-1 outline-none"

/** 单个菜单项通用样式（Apifox：中性灰悬停、保留文字色、4px 圆角内嵌） */
function itemClass(disabled?: boolean): string {
  return cn(
    "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded select-none outline-none",
    disabled
      ? "text-muted-foreground cursor-not-allowed"
      : "text-foreground data-[highlighted]:bg-hover",
  )
}

/** 菜单项内部内容：图标 + 文字 + 快捷键 */
function ItemInner(props: { item: MenuItem }) {
  return (
    <>
      <Show when={props.item.icon}>
        <span class="w-4 h-4 shrink-0 flex items-center justify-center">{props.item.icon}</span>
      </Show>
      <span class="flex-1">{props.item.label}</span>
      <Show when={props.item.accelerator}>
        <span class="text-xs text-muted-foreground ml-4">{props.item.accelerator}</span>
      </Show>
    </>
  )
}

/** 在给定层级的直接菜单项中按 value 找到并触发点击（子菜单由各自的 Root 处理） */
function selectFrom(items: MenuItem[], value: string) {
  const item = items.find(i => i.key === value && !i.separator && !i.children?.length)
  item?.onClick?.()
}

/** 递归渲染某一层的菜单项（分隔线 / 普通项 / 子菜单） */
function renderItems(items: MenuItem[]): JSX.Element {
  return (
    <For each={items}>
      {(item) => (
        <Show
          when={!item.separator}
          fallback={<ArkMenu.Separator class="my-1 border-t border-divider" />}
        >
          <Show
            when={item.children?.length}
            fallback={(
              <ArkMenu.Item value={item.key} disabled={item.disabled} class={itemClass(item.disabled)}>
                <ItemInner item={item} />
              </ArkMenu.Item>
            )}
          >
            {/* 子菜单：独立的 Menu.Root，自身 onSelect 处理其直接项 */}
            <ArkMenu.Root
              positioning={{ placement: "right-start", gutter: 4 }}
              onSelect={(details) => selectFrom(item.children!, details.value)}
            >
              <ArkMenu.TriggerItem class={itemClass(item.disabled)}>
                <ItemInner item={item} />
                <svg class="h-3.5 w-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </ArkMenu.TriggerItem>
              <Portal>
                <ArkMenu.Positioner>
                  <ArkMenu.Content class={CONTENT_CLASS}>
                    {renderItems(item.children!)}
                  </ArkMenu.Content>
                </ArkMenu.Positioner>
              </Portal>
            </ArkMenu.Root>
          </Show>
        </Show>
      )}
    </For>
  )
}

/**
 * DropdownMenu 通用下拉菜单组件
 *
 * trigger="click" + placement="anchor-bottom": 点击弹出，菜单对齐触发元素底部居中
 * trigger="click" + placement="cursor": 点击弹出，菜单对齐触发元素左下角
 * trigger="contextmenu" + placement="cursor": 右键弹出，菜单出现在鼠标位置
 */
export function DropdownMenu(props: DropdownMenuProps) {
  return (
    <Show
      when={props.items.length > 0}
      fallback={<div class={props.class}>{props.children}</div>}
    >
      <ArkMenu.Root
        onSelect={(details) => selectFrom(props.items, details.value)}
        positioning={{ placement: props.placement === "cursor" ? "bottom-start" : "bottom", gutter: 4 }}
      >
        <Show
          when={props.trigger === "contextmenu"}
          fallback={(
            <ArkMenu.Trigger asChild={(triggerProps) => (
              <div {...arkMerge(triggerProps)({ class: props.class })}>{props.children}</div>
            )}
            />
          )}
        >
          <ArkMenu.ContextTrigger asChild={(triggerProps) => (
            // 阻止右键事件冒泡到父级 ContextTrigger，避免树形嵌套结构中同时弹出多个上下文菜单
            <div {...arkMerge(triggerProps)({ class: props.class, onContextMenu: (e: MouseEvent) => e.stopPropagation() })}>{props.children}</div>
          )}
          />
        </Show>
        <Portal>
          <ArkMenu.Positioner>
            <ArkMenu.Content class={CONTENT_CLASS}>
              {renderItems(props.items)}
            </ArkMenu.Content>
          </ArkMenu.Positioner>
        </Portal>
      </ArkMenu.Root>
    </Show>
  )
}
