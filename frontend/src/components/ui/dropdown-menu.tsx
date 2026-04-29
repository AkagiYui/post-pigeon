// DropdownMenu 通用下拉菜单组件
// 支持 click 和 contextmenu 两种触发方式，cursor 和 anchor 两种定位策略
// ContextMenu 右键菜单基于此组件封装
import { createEffect, createSignal, For, type JSX, onCleanup, Show, splitProps } from "solid-js"

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

/** 菜单宽度估算值，用于视口边界检测 */
const ESTIMATED_MENU_WIDTH = 200
/** 菜单项高度估算值 */
const ESTIMATED_ITEM_HEIGHT = 34
/** 分隔线高度估算值 */
const ESTIMATED_SEPARATOR_HEIGHT = 9
/** 菜单上下内边距 */
const MENU_PADDING_Y = 8
/** 菜单与视口边缘的最小间距 */
const VIEWPORT_MARGIN = 8
/** 菜单与触发元素的间距 */
const TRIGGER_GAP = 4

/** 模块级 ESC 关闭回调栈，支持嵌套菜单逐级关闭 */
const escStack: (() => void)[] = []

/** 锚点实际弹出方向 */
type AnchorDirection = "bottom" | "top"

/** 估算菜单高度（递归计算菜单项和分隔线） */
function estimateMenuHeight(items: MenuItem[]): number {
  let itemCount = 0
  let separatorCount = 0
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.separator) {
        separatorCount++
      } else {
        itemCount++
        if (item.children?.length) walk(item.children)
      }
    }
  }
  walk(items)
  const estimated = itemCount * ESTIMATED_ITEM_HEIGHT + separatorCount * ESTIMATED_SEPARATOR_HEIGHT + MENU_PADDING_Y
  return Math.min(estimated, window.innerHeight * 0.8)
}

/** 将鼠标坐标限制在视口范围内 */
function clampToViewport(x: number, y: number, menuWidth: number, menuHeight: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: Math.min(Math.max(x, VIEWPORT_MARGIN), vw - menuWidth - VIEWPORT_MARGIN),
    y: Math.min(Math.max(y, VIEWPORT_MARGIN), vh - menuHeight - VIEWPORT_MARGIN),
  }
}

/** 计算锚点定位时的最佳位置（自动翻转） */
function calcAnchorPosition(
  triggerEl: HTMLElement,
  items: MenuItem[],
  preferredDir: AnchorDirection,
): { x: number; y: number; direction: AnchorDirection } {
  const rect = triggerEl.getBoundingClientRect()
  const menuHeight = estimateMenuHeight(items)
  const vh = window.innerHeight
  const vw = window.innerWidth
  const centerX = rect.left + rect.width / 2

  const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN
  const spaceAbove = rect.top - VIEWPORT_MARGIN

  // 根据可用空间选择弹出方向
  let direction: AnchorDirection = preferredDir
  if (preferredDir === "bottom" && spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    direction = "top"
  } else if (preferredDir === "top" && spaceAbove < menuHeight && spaceBelow > spaceAbove) {
    direction = "bottom"
  }

  // 根据方向计算 Y 坐标
  const y = direction === "bottom"
    ? rect.bottom + TRIGGER_GAP
    : rect.top - menuHeight - TRIGGER_GAP

  // 水平方向：确保菜单不超出视口左右边界
  const halfWidth = ESTIMATED_MENU_WIDTH / 2
  let x = centerX
  if (x - halfWidth < VIEWPORT_MARGIN) {
    x = VIEWPORT_MARGIN + halfWidth
  } else if (x + halfWidth > vw - VIEWPORT_MARGIN) {
    x = vw - VIEWPORT_MARGIN - halfWidth
  }

  return { x, y, direction }
}

/**
 * DropdownMenu 通用下拉菜单组件
 *
 * trigger="click" + placement="anchor-bottom": 点击按钮弹出，菜单对齐按钮底部居中（如 "+" 新建菜单）
 * trigger="click" + placement="cursor": 点击按钮弹出，菜单出现在点击位置（如 "..." 操作菜单）
 * trigger="contextmenu" + placement="cursor": 右键弹出，菜单出现在鼠标位置（如 ContextMenu）
 *
 * 支持视口边界检测：当锚点方向空间不足时自动翻转方向，鼠标定位时自动限制在视口内，
 * 确保菜单始终完全可见。
 *
 * 通过 e.stopPropagation() 阻止事件冒泡，避免嵌套菜单同时弹出。
 */
export function DropdownMenu(props: DropdownMenuProps) {
  const [local] = splitProps(props, ["children", "items", "trigger", "placement", "class"])
  const [visible, setVisible] = createSignal(false)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  // 锚点定位时的实际弹出方向（可能因空间不足而翻转）
  const [anchorDir, setAnchorDir] = createSignal<AnchorDirection>("bottom")
  let triggerRef: HTMLDivElement | undefined

  const close = () => setVisible(false)

  // 监听 ESC 键：从栈顶弹出最深层菜单的关闭回调
  createEffect(() => {
    if (visible()) {
      const closeFn = close
      escStack.push(closeFn)

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          // 弹出栈顶（最深层子菜单）的关闭回调
          if (escStack.length > 0) {
            escStack[escStack.length - 1]()
          }
        }
      }
      document.addEventListener("keydown", handleKeyDown)

      onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown)
        const idx = escStack.indexOf(closeFn)
        if (idx >= 0) escStack.splice(idx, 1)
      })
    }
  })

  // 点击触发处理：根据 placement 计算位置并应用视口调整
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation() // 阻止冒泡，避免触发父级点击事件（如树节点切换）
    if (local.items.length === 0) return

    if (local.placement === "anchor-bottom") {
      if (!triggerRef) return
      const { x, y, direction } = calcAnchorPosition(triggerRef, local.items, "bottom")
      setAnchorDir(direction)
      setPosition({ x, y })
    } else {
      // cursor 定位：限制在视口内
      const menuHeight = estimateMenuHeight(local.items)
      const adjusted = clampToViewport(e.clientX, e.clientY, ESTIMATED_MENU_WIDTH, menuHeight)
      setPosition(adjusted)
    }
    setVisible(true)
  }

  // 右键触发处理：鼠标坐标 + 视口边界限制
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // 阻止冒泡到父级 ContextMenu，避免多层菜单同时弹出
    if (local.items.length === 0) return
    const menuHeight = estimateMenuHeight(local.items)
    const adjusted = clampToViewport(e.clientX, e.clientY, ESTIMATED_MENU_WIDTH, menuHeight)
    setPosition(adjusted)
    setVisible(true)
  }

  // 锚点定位需要水平居中偏移
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

/** 子菜单渲染（含视口边界检测，自动左右翻转） */
function SubMenu(props: { item: MenuItem; onClose: () => void }) {
  const [open, setOpen] = createSignal(false)
  const [pos, setPos] = createSignal({ x: 0, y: 0 })

  // 子菜单打开时入栈 ESC 回调，关闭时自动出栈
  createEffect(() => {
    if (open()) {
      const closeFn = () => setOpen(false)
      escStack.push(closeFn)
      onCleanup(() => {
        const idx = escStack.indexOf(closeFn)
        if (idx >= 0) escStack.splice(idx, 1)
      })
    }
  })

  const handleMouseEnter = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const items = props.item.children || []
    const menuHeight = estimateMenuHeight(items)
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 尝试右侧弹出
    let x = rect.right
    let y = rect.top

    // 水平方向：右侧空间不够则翻转到左侧
    if (x + ESTIMATED_MENU_WIDTH > vw - VIEWPORT_MARGIN) {
      x = rect.left - ESTIMATED_MENU_WIDTH
    }

    // 垂直方向：限制在视口内
    if (y + menuHeight > vh - VIEWPORT_MARGIN) {
      y = vh - menuHeight - VIEWPORT_MARGIN
    }
    y = Math.max(VIEWPORT_MARGIN, y)

    setPos({ x, y })
    setOpen(true)
  }

  return (
    <div
      class="relative"
      onMouseEnter={handleMouseEnter}
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
