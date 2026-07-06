// Popover 气泡弹出组件，封装 Ark UI Popover
// Ark UI 基于 floating-ui 定位并 Portal 到 body（避免被父容器 overflow 裁剪），
// 处理外部点击关闭、焦点管理与 ARIA。支持受控（open/onOpenChange）与非受控两种模式。
import { Popover as ArkPopover } from "@ark-ui/solid/popover"
import { type JSX, splitProps } from "solid-js"
import { Portal } from "solid-js/web"

import { arkMerge } from "@/lib/ark"
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
    <ArkPopover.Root
      // open 为 undefined 时走非受控模式；提供时为受控模式
      open={local.open}
      onOpenChange={(details) => local.onOpenChange?.(details.open)}
      positioning={{ placement: local.placement ?? "bottom", gutter: 4 }}
    >
      <ArkPopover.Trigger asChild={(triggerProps) => (
        <div {...arkMerge(triggerProps)({ class: "inline-flex" })}>
          {local.trigger}
        </div>
      )}
      />
      <Portal>
        <ArkPopover.Positioner>
          <ArkPopover.Content
            class={cn(
              "z-50 bg-surface rounded-lg shadow-lg border border-border p-3 min-w-30 outline-none",
              local.class,
            )}
          >
            {local.children}
          </ArkPopover.Content>
        </ArkPopover.Positioner>
      </Portal>
    </ArkPopover.Root>
  )
}
