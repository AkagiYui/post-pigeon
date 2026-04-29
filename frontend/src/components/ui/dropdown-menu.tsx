// DropdownMenu 通用下拉菜单组件
// 支持 click 和 contextmenu 两种触发方式，cursor 和 anchor 两种定位策略
// ContextMenu 右键菜单基于此组件封装
import { createSignal, For, type JSX, Show, splitProps } from "solid-js"

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
  /** 定位策略：cursor 跟随鼠标坐标，anchor-bottom 基于触发元素底部居中 */
  placement?: "cursor" | "anchor-bottom"
  /** 自定义类名 */
  class?: string
}

/**
 * DropdownMenu 通用下拉菜单组件
 *
 * trigger="click" + placement="anchor-bottom": 点击按钮弹出，菜单对齐按钮底部居中（如 "+" 新建菜单）
 * trigger="click" + placement="cursor": 点击按钮弹出，菜单出现在点击位置（如 "..." 操作菜单）
 * trigger="contextmenu" + placement="cursor": 右键弹出，菜单出现在鼠标位置（如 ContextMenu）
 *
 * 通过 e.stopPropagation() 阻止事件冒泡，避免嵌套菜单同时弹出。
 */
export function DropdownMenu(props: DropdownMenuProps) {
  const [local] = splitProps(props, ["children", "items", "trigger", "placement", "class"])
  const [visible, setVisible] = createSignal(false)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  let triggerRef: HTMLDivElement | undefined

  const close = () => setVisible(false)

  // 计算基于触发元素的锚点位置（底部居中）
  const calcAnchorPosition = () => {
    if (!triggerRef) return { x: 0, y: 0 }
    const rect = triggerRef.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.bottom + 4 }
  }

  // 点击触发处理
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation() // 阻止冒泡，避免触发父级点击事件（如树节点切换）
    if (local.items.length === 0) return
    setPosition(
      local.placement === "anchor-bottom"
        ? calcAnchorPosition()
        : { x: e.clientX, y: e.clientY },
    )
    setVisible(true)
  }

  // 右键触发处理
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 阻止冒泡到父级 ContextMenu，避免多层菜单同时弹出
    if (local.items.length === 0) return
    setPosition({ x: e.clientX, y: e.clientY })
    setVisible(true)
  }

  // anchor 定位需要水平居中偏移
  const getTransform = () => {
    if (local.placement === "anchor-bottom") return "translateX(-50%)"
    return undefined
  }

  // 根据 trigger 类型决定事件处理器
  const clickHandler = local.trigger === "click" ? handleClick : undefined
  const contextMenuHandler = local.trigger === "contextmenu" ? handleContextMenu : undefined

  return (
    <div
      ref={triggerRef}
      class={local.class}
      onClick={clickHandler}
      onContextMenu={contextMenuHandler}
    >
      {local.children}

      {/* 透明遮罩层，点击关闭 */}
      <div
        class="fixed inset-0 z-40"
        hidden={!visible()}
        onClick={(e) => { e.stopPropagation(); close() }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); close() }}
      />

      {/* 菜单容器 */}
      <div
        class="fixed z-50 min-w-45 bg-surface border border-border rounded-md shadow-lg py-1"
        hidden={!visible()}
        onClick={(e) => e.stopPropagation()}
        style={{
          left: `${position().x}px`,
          top: `${position().y}px`,
          transform: getTransform(),
        }}
      >
        <DropdownMenuItems items={local.items} onClose={close} />
      </div>
    </div>
  )
}

/** 菜单项列表渲染 */
function DropdownMenuItems(props: { items: MenuItem[]; onClose: () => void }) {
  return (
    <For each={props.items}>
      {(item) => (
        <Show
          when={!item.separator}
          fallback={<div class="my-1 border-t border-border" />}
        >
          <Show
            when={!item.children?.length}
            fallback={<SubMenu item={item} onClose={props.onClose} />}
          >
            <div
              class={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none",
                item.disabled
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-accent-muted hover:text-accent",
              )}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.()
                  props.onClose()
                }
              }}
            >
              <Show when={item.icon}>
                <span class="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
              </Show>
              <span class="flex-1">{item.label}</span>
              <Show when={item.accelerator}>
                <span class="text-xs text-muted-foreground ml-4">{item.accelerator}</span>
              </Show>
            </div>
          </Show>
        </Show>
      )}
    </For>
  )
}

/** 子菜单渲染 */
function SubMenu(props: { item: MenuItem; onClose: () => void }) {
  const [open, setOpen] = createSignal(false)
  const [pos, setPos] = createSignal({ x: 0, y: 0 })

  return (
    <div
      class="relative"
      onMouseEnter={(e) => {
        setOpen(true)
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setPos({ x: rect.right, y: rect.top })
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <div class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none hover:bg-accent-muted hover:text-accent">
        <Show when={props.item.icon}>
          <span class="w-4 h-4 shrink-0 flex items-center justify-center">{props.item.icon}</span>
        </Show>
        <span class="flex-1">{props.item.label}</span>
        <svg class="h-3.5 w-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <Show when={open()}>
        <div
          class="fixed z-50 min-w-45 bg-surface border border-border rounded-md shadow-lg py-1"
          style={{ left: `${pos().x}px`, top: `${pos().y}px` }}
        >
          <DropdownMenuItems items={props.item.children || []} onClose={props.onClose} />
        </div>
      </Show>
    </div>
  )
}
