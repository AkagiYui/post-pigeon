// Tooltip 提示组件，封装 Kobalte Tooltip
// Kobalte 基于 floating-ui 自动处理定位、视口翻转、Portal 渲染与无障碍（role/aria-describedby），
// 替代了原先手写的两阶段测量 + 视口钳位逻辑。
import { Tooltip as KTooltip } from "@kobalte/core/tooltip"
import { type JSX, splitProps } from "solid-js"

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
    <KTooltip
      openDelay={local.delay ?? 300}
      placement={local.placement ?? "top"}
      gutter={4}
    >
      <KTooltip.Trigger as="div" class={cn("relative inline-flex", local.class)}>
        {local.children}
      </KTooltip.Trigger>
      <KTooltip.Portal>
        <KTooltip.Content
          class={cn(
            "z-50 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground shadow-md border border-border whitespace-nowrap pointer-events-none",
          )}
        >
          {local.content}
        </KTooltip.Content>
      </KTooltip.Portal>
    </KTooltip>
  )
}
