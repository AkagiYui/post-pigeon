// HoverCard 悬停卡片：hover 触发、展示富文本（JSX）内容的气泡，封装 Kobalte HoverCard。
// Kobalte 基于 floating-ui 自动定位并 Portal 到 body（避免被父容器裁剪），
// 处理指针进入/离开的开合延迟与无障碍语义。
import { HoverCard as KHoverCard } from "@kobalte/core/hover-card"
import { type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface HoverCardProps {
  /** 触发元素 */
  children: JSX.Element
  /** 卡片内容（富文本） */
  content: JSX.Element
  /** 位置（不设置则按可用空间自动选择上/下） */
  placement?: "top" | "bottom"
  /** 延迟显示时间（毫秒） */
  delay?: number
  /** 卡片自定义类名 */
  class?: string
}

export function HoverCard(props: HoverCardProps) {
  const [local] = splitProps(props, ["children", "content", "placement", "delay", "class"])

  return (
    <KHoverCard
      openDelay={local.delay ?? 120}
      placement={local.placement ?? "top"}
      gutter={6}
    >
      <KHoverCard.Trigger as="div" class="relative inline-flex">
        {local.children}
      </KHoverCard.Trigger>
      <KHoverCard.Portal>
        <KHoverCard.Content
          class={cn(
            "z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3 outline-none",
            local.class,
          )}
        >
          {local.content}
        </KHoverCard.Content>
      </KHoverCard.Portal>
    </KHoverCard>
  )
}
