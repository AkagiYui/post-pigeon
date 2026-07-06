// DropdownMenu 通用下拉菜单组件，封装 Kobalte DropdownMenu / ContextMenu
// - trigger="click"（默认）→ Kobalte DropdownMenu：锚定触发元素，floating-ui 自动翻转
// - trigger="contextmenu" → Kobalte ContextMenu：在鼠标位置弹出
// 两者共享同一套 Menu.* 子组件（Item / Sub / Separator 等），因此用同一份递归渲染器。
// ContextMenu 右键菜单基于此组件封装。
import { ContextMenu as KContextMenu } from "@kobalte/core/context-menu"
import { DropdownMenu as KDropdownMenu } from "@kobalte/core/dropdown-menu"
import { For, type JSX, Show } from "solid-js"

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

/** 菜单面板通用样式 */
const CONTENT_CLASS = "z-50 min-w-45 max-h-[80vh] overflow-y-auto bg-surface border border-border rounded-md shadow-lg py-1 outline-none"

/** 单个菜单项通用样式 */
function itemClass(disabled?: boolean): string {
  return cn(
    "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none outline-none",
    disabled
      ? "text-muted-foreground cursor-not-allowed"
      : "text-foreground data-[highlighted]:bg-accent-muted data-[highlighted]:text-accent",
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

/** Kobalte 菜单子组件集合（DropdownMenu 与 ContextMenu 结构一致） */
interface MenuParts {
  Item: typeof KDropdownMenu.Item
  Separator: typeof KDropdownMenu.Separator
  Sub: typeof KDropdownMenu.Sub
  SubTrigger: typeof KDropdownMenu.SubTrigger
  SubContent: typeof KDropdownMenu.SubContent
  Portal: typeof KDropdownMenu.Portal
}

const dropdownParts: MenuParts = {
  Item: KDropdownMenu.Item,
  Separator: KDropdownMenu.Separator,
  Sub: KDropdownMenu.Sub,
  SubTrigger: KDropdownMenu.SubTrigger,
  SubContent: KDropdownMenu.SubContent,
  Portal: KDropdownMenu.Portal,
}

const contextParts: MenuParts = {
  Item: KContextMenu.Item,
  Separator: KContextMenu.Separator,
  Sub: KContextMenu.Sub,
  SubTrigger: KContextMenu.SubTrigger,
  SubContent: KContextMenu.SubContent,
  Portal: KContextMenu.Portal,
}

/** 递归渲染菜单项（支持分隔线与多级子菜单） */
function renderItems(items: MenuItem[], M: MenuParts): JSX.Element {
  return (
    <For each={items}>
      {(item) => (
        <Show
          when={!item.separator}
          fallback={<M.Separator class="my-1 border-t border-border" />}
        >
          <Show
            when={item.children?.length}
            fallback={(
              <M.Item
                class={itemClass(item.disabled)}
                disabled={item.disabled}
                onSelect={() => item.onClick?.()}
              >
                <ItemInner item={item} />
              </M.Item>
            )}
          >
            <M.Sub gutter={4} shift={-4}>
              <M.SubTrigger class={itemClass(item.disabled)}>
                <ItemInner item={item} />
                <svg class="h-3.5 w-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </M.SubTrigger>
              <M.Portal>
                <M.SubContent class={CONTENT_CLASS}>
                  {renderItems(item.children!, M)}
                </M.SubContent>
              </M.Portal>
            </M.Sub>
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
 *
 * 定位、视口翻转、外部点击关闭、ESC 逐级关闭、方向键导航与 ARIA 均由 Kobalte 处理。
 */
export function DropdownMenu(props: DropdownMenuProps) {
  return (
    <Show
      when={props.items.length > 0}
      fallback={<div class={props.class}>{props.children}</div>}
    >
      <Show
        when={props.trigger === "contextmenu"}
        fallback={(
          <KDropdownMenu
            placement={props.placement === "cursor" ? "bottom-start" : "bottom"}
            gutter={4}
          >
            <KDropdownMenu.Trigger as="div" class={props.class}>
              {props.children}
            </KDropdownMenu.Trigger>
            <KDropdownMenu.Portal>
              <KDropdownMenu.Content class={CONTENT_CLASS}>
                {renderItems(props.items, dropdownParts)}
              </KDropdownMenu.Content>
            </KDropdownMenu.Portal>
          </KDropdownMenu>
        )}
      >
        <KContextMenu>
          <KContextMenu.Trigger as="div" class={props.class}>
            {props.children}
          </KContextMenu.Trigger>
          <KContextMenu.Portal>
            <KContextMenu.Content class={CONTENT_CLASS}>
              {renderItems(props.items, contextParts)}
            </KContextMenu.Content>
          </KContextMenu.Portal>
        </KContextMenu>
      </Show>
    </Show>
  )
}
