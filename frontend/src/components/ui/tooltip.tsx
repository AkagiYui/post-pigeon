// Tooltip 提示组件
import { createEffect, createSignal, type JSX, onCleanup, Show, splitProps } from "solid-js"

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
}

/** 生成简短唯一 ID */
let idCounter = 0
const uid = () => `pigeon-tooltip-${++idCounter}`

/**
 * Tooltip 提示组件
 *
 * 使用 position: fixed + 两阶段渲染策略：
 * 1. 先在视口外渲染 tooltip 以测量实际尺寸
 * 2. 根据 trigger 位置和视口边界计算出安全坐标，再移入正确位置
 * 确保 tooltip 永远不溢出视口，避免触发滚动条
 */
export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ["content", "children", "delay", "placement"])
  const [visible, setVisible] = createSignal(false)
  const [placement, setPlacement] = createSignal<"top" | "bottom" | "left" | "right">("top")
  // 安全坐标，null 表示仍在测量阶段（tooltip 在视口外不可见）
  const [safePos, setSafePos] = createSignal<{ left: number; top: number } | null>(null)
  let triggerRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined
  let timer: ReturnType<typeof setTimeout>
  // 用于无障碍关联的唯一 ID
  const tooltipId = uid()

  // 组件卸载时清理定时器，防止内存泄漏
  onCleanup(() => clearTimeout(timer))

  // 计算最佳弹出位置（基于估算尺寸选择方向）
  const calcPlacement = (): "top" | "bottom" | "left" | "right" => {
    if (local.placement) return local.placement
    if (!triggerRef) return "top"

    const rect = triggerRef.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const estW = 80
    const estH = 30

    const scores = {
      top: rect.top >= estH ? rect.top : -1000,
      bottom: vh - rect.bottom >= estH ? vh - rect.bottom : -1000,
      right: vw - rect.right >= estW ? vw - rect.right : -1000,
      left: rect.left >= estW ? rect.left : -1000,
    }

    return Object.entries(scores).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0] as "top" | "bottom" | "left" | "right"
  }

  // 测量 tooltip 实际尺寸，计算并应用安全坐标
  const positionTooltip = () => {
    if (!tooltipRef || !triggerRef) return

    // tooltip 此时在视口外（transform: translate(-9999px, -9999px)），
    // getBoundingClientRect 仍能返回正确的宽高
    const tRect = tooltipRef.getBoundingClientRect()
    const gRect = triggerRef.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 4
    const p = placement()

    // 根据 placement 计算锚定坐标
    let left: number
    let top: number

    if (p === "top") {
      left = gRect.left + gRect.width / 2 - tRect.width / 2
      top = gRect.top - tRect.height - gap
    } else if (p === "bottom") {
      left = gRect.left + gRect.width / 2 - tRect.width / 2
      top = gRect.bottom + gap
    } else if (p === "left") {
      left = gRect.left - tRect.width - gap
      top = gRect.top + gRect.height / 2 - tRect.height / 2
    } else {
      // right
      left = gRect.right + gap
      top = gRect.top + gRect.height / 2 - tRect.height / 2
    }

    // 钳位到视口内，确保不溢出
    left = Math.max(gap, Math.min(left, vw - tRect.width - gap))
    top = Math.max(gap, Math.min(top, vh - tRect.height - gap))

    setSafePos({ left, top })
  }

  // 首次显示时定位
  createEffect(() => {
    if (!visible() || !tooltipRef || !triggerRef) {
      setSafePos(null)
      return
    }

    positionTooltip()

    // 窗口缩放时重新定位
    window.addEventListener("resize", positionTooltip)
    onCleanup(() => window.removeEventListener("resize", positionTooltip))
  })

  // 页面滚动时隐藏 tooltip（标准 UX：滚动时 tooltip 应消失）
  createEffect(() => {
    if (!visible()) return

    const hide = () => {
      setVisible(false)
      setSafePos(null)
    }
    // capture 阶段捕获所有滚动事件
    window.addEventListener("scroll", hide, { capture: true })
    onCleanup(() => window.removeEventListener("scroll", hide, { capture: true }))
  })

  return (
    <div
      class="relative inline-flex"
      ref={triggerRef}
      // 无障碍：将 trigger 与 tooltip 关联
      aria-describedby={visible() ? tooltipId : undefined}
      onMouseEnter={() => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          setPlacement(calcPlacement())
          setVisible(true)
          // visible=true 触发 createEffect → 测量 → setSafePos
          // 整个过程在同一帧内完成，不会导致溢出
        }, local.delay || 300)
      }}
      onMouseLeave={() => {
        clearTimeout(timer)
        setVisible(false)
        setSafePos(null)
      }}
    >
      {local.children}
      <Show when={visible()}>
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          class={cn(
            "fixed z-50 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground shadow-md border border-border whitespace-nowrap pointer-events-none",
          )}
          style={
            safePos()
              ? { left: `${safePos()!.left}px`, top: `${safePos()!.top}px` }
              : // 测量阶段：将 tooltip 移至视口外，避免影响布局
                { transform: "translate(-9999px, -9999px)" }
          }
        >
          {local.content}
        </div>
      </Show>
    </div>
  )
}
