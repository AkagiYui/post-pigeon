// Tooltip 提示组件，封装 Ark UI Tooltip
// Ark UI（基于 Zag.js 状态机 + floating-ui）负责悬停/聚焦触发、延迟、定位翻转、
// Portal 渲染与无障碍（role="tooltip"、aria 关联）。
import { Tooltip as ArkTooltip } from "@ark-ui/solid/tooltip"
import { type JSX, splitProps } from "solid-js"
import { Portal } from "solid-js/web"

import { arkMerge } from "@/lib/ark"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  /** 提示内容 */
  content: string
  /** 子元素 */
  children: JSX.Element
  /** 延迟显示时间（毫秒） */
  delay?: number
  /** 位置（不设置则自动选择） */
  placement?: "top" | "bottom" | "left" | "right"
  /** 触发元素包裹层自定义类名（如需撑满容器宽度可传 "block w-full"） */
  class?: string
}

/**
 * Tooltip 提示组件
 */
export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ["content", "children", "delay", "placement", "class"])

  return (
    <ArkTooltip.Root
      openDelay={local.delay ?? 300}
      closeDelay={0}
      positioning={{ placement: local.placement ?? "top", gutter: 4 }}
    >
      {/* asChild 用 <div> 替换默认的 <button> 触发器，避免包裹按钮时出现 button 嵌套 */}
      <ArkTooltip.Trigger asChild={(triggerProps) => (
        <div {...arkMerge(triggerProps)({ class: cn("relative inline-flex", local.class) })}>
          {local.children}
        </div>
      )}
      />
      <Portal>
        <ArkTooltip.Positioner>
          <ArkTooltip.Content
            class={cn(
              "z-50 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground shadow-md border border-border whitespace-nowrap pointer-events-none",
            )}
          >
            {local.content}
          </ArkTooltip.Content>
        </ArkTooltip.Positioner>
      </Portal>
    </ArkTooltip.Root>
  )
}
