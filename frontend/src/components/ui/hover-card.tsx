// HoverCard 悬停卡片：hover 触发、展示富文本（JSX）内容的气泡，封装 Ark UI HoverCard。
// Ark UI 基于 floating-ui 自动定位并 Portal 到 body（避免被父容器裁剪），
// 处理指针进入/离开的开合延迟与无障碍语义。
import { HoverCard as ArkHoverCard } from "@ark-ui/solid/hover-card"
import { type JSX, splitProps } from "solid-js"
import { Portal } from "solid-js/web"

import { arkMerge } from "@/lib/ark"
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
    <ArkHoverCard.Root
      openDelay={local.delay ?? 120}
      closeDelay={100}
      positioning={{ placement: local.placement ?? "top", gutter: 6 }}
    >
      <ArkHoverCard.Trigger asChild={(triggerProps) => (
        <div {...arkMerge(triggerProps)({ class: "relative inline-flex" })}>
          {local.children}
        </div>
      )}
      />
      <Portal>
        <ArkHoverCard.Positioner>
          <ArkHoverCard.Content
            class={cn(
              "z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3 outline-none",
              local.class,
            )}
          >
            {local.content}
          </ArkHoverCard.Content>
        </ArkHoverCard.Positioner>
      </Portal>
    </ArkHoverCard.Root>
  )
}
