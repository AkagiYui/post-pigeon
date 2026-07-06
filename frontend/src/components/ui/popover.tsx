// Popover 气泡弹出组件，封装 Kobalte Popover
// Kobalte 基于 floating-ui 自动定位并 Portal 到 body，避免被父容器 overflow 裁剪，
// 同时处理外部点击关闭、焦点管理与 ARIA。支持受控（open/onOpenChange）与非受控两种模式。
import { Popover as KPopover } from "@kobalte/core/popover"
import { type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface PopoverProps {
  /** 触发元素 */
  trigger: JSX.Element
  /** 弹出内容 */
  children: JSX.Element
  /** 弹出位置（不设置则自动选择） */
  placement?: "top" | "bottom" | "left" | "right"
  /** 自定义类名 */
  class?: string
  /** 是否显示 */
  open?: boolean
  /** 显示变更回调 */
  onOpenChange?: (open: boolean) => void
}

/**
 * Popover 气泡弹出组件
 */
export function Popover(props: PopoverProps) {
  const [local] = splitProps(props, ["trigger", "children", "placement", "class", "open", "onOpenChange"])

  return (
    <KPopover
      // open 为 undefined 时走非受控模式；提供时为受控模式
      open={local.open}
      onOpenChange={local.onOpenChange}
      placement={local.placement ?? "bottom"}
      gutter={4}
    >
      <KPopover.Trigger as="div" class="inline-flex">
        {local.trigger}
      </KPopover.Trigger>
      <KPopover.Portal>
        <KPopover.Content
          class={cn(
            "z-50 bg-surface rounded-lg shadow-lg border border-border p-3 min-w-30 outline-none",
            local.class,
          )}
        >
          {local.children}
        </KPopover.Content>
      </KPopover.Portal>
    </KPopover>
  )
}
