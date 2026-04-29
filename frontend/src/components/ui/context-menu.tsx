// ContextMenu 右键菜单组件
// 基于 DropdownMenu 封装，绑定 trigger="contextmenu" + placement="cursor"
import type { JSX } from "solid-js"

import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu"

// 重新导出 MenuItem，保持向后兼容
export type { MenuItem }

export interface ContextMenuProps {
  /** 子元素（触发区域） */
  children: JSX.Element
  /** 菜单项列表 */
  items: MenuItem[]
  /** 自定义类名 */
  class?: string
}

/**
 * ContextMenu 右键菜单组件，支持多级菜单
 *
 * 基于 DropdownMenu 封装，通过 e.stopPropagation() 阻止右键事件冒泡到父级 ContextMenu，
 * 避免树形结构中嵌套的上下文菜单同时弹出。
 */
export function ContextMenu(props: ContextMenuProps) {
  return (
    <DropdownMenu trigger="contextmenu" placement="cursor" items={props.items} class={props.class}>
      {props.children}
    </DropdownMenu>
  )
}
