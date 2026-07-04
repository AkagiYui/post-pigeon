// HoverCard 悬停卡片：hover 触发、展示富文本（JSX）内容的气泡。
// 复用 Tooltip 的「两阶段测量 + 视口钳位」定位策略，避免溢出视口；使用 fixed 定位避免被父容器裁剪。
import { createEffect, createSignal, type JSX, onCleanup, Show } from "solid-js"

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
  const [visible, setVisible] = createSignal(false)
  const [placement, setPlacement] = createSignal<"top" | "bottom">("top")
  // 安全坐标，null 表示仍在测量阶段（卡片渲染在视口外不可见）
  const [safePos, setSafePos] = createSignal<{ left: number; top: number } | null>(null)
  let triggerRef: HTMLDivElement | undefined
  let cardRef: HTMLDivElement | undefined
  let timer: ReturnType<typeof setTimeout>

  onCleanup(() => clearTimeout(timer))

  const calcPlacement = (): "top" | "bottom" => {
    if (props.placement) return props.placement
    if (!triggerRef) return "top"
    const r = triggerRef.getBoundingClientRect()
    // 优先放在空间更充裕的一侧（响应工具栏通常在下半屏，故常朝上）
    return r.top >= window.innerHeight - r.bottom ? "top" : "bottom"
  }

  const position = () => {
    if (!cardRef || !triggerRef) return
    const c = cardRef.getBoundingClientRect()
    const g = triggerRef.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 6
    let left = g.left + g.width / 2 - c.width / 2
    let top = placement() === "top" ? g.top - c.height - gap : g.bottom + gap
    left = Math.max(gap, Math.min(left, vw - c.width - gap))
    top = Math.max(gap, Math.min(top, vh - c.height - gap))
    setSafePos({ left, top })
  }

  createEffect(() => {
    if (!visible() || !cardRef || !triggerRef) {
      setSafePos(null)
      return
    }
    position()
    window.addEventListener("resize", position)
    onCleanup(() => window.removeEventListener("resize", position))
  })

  // 滚动时隐藏，避免卡片脱离触发元素
  createEffect(() => {
    if (!visible()) return
    const hide = () => setVisible(false)
    window.addEventListener("scroll", hide, { capture: true })
    onCleanup(() => window.removeEventListener("scroll", hide, { capture: true }))
  })

  return (
    <div
      class="relative inline-flex"
      ref={triggerRef}
      onMouseEnter={() => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          setPlacement(calcPlacement())
          setVisible(true)
        }, props.delay ?? 120)
      }}
      onMouseLeave={() => {
        clearTimeout(timer)
        setVisible(false)
        setSafePos(null)
      }}
    >
      {props.children}
      <Show when={visible()}>
        <div
          ref={cardRef}
          role="tooltip"
          class={cn(
            "fixed z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3",
            props.class,
          )}
          style={
            safePos()
              ? { left: `${safePos()!.left}px`, top: `${safePos()!.top}px` }
              : { transform: "translate(-9999px, -9999px)" }
          }
        >
          {props.content}
        </div>
      </Show>
    </div>
  )
}
