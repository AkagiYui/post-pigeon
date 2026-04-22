// Popover 气泡弹出组件
import { createEffect, createSignal, type JSX, Show } from "solid-js"

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
 * 支持自动定位，根据视口边界选择最佳弹出位置
 */
export function Popover(props: PopoverProps) {
  const [internalOpen, setInternalOpen] = createSignal(false)
  const isOpen = () => props.open !== undefined ? props.open : internalOpen()
  let triggerRef: HTMLDivElement | undefined
  const [autoPlacement, setAutoPlacement] = createSignal<"top" | "bottom" | "left" | "right">("bottom")

  const setOpen = (val: boolean) => {
    setInternalOpen(val)
    props.onOpenChange?.(val)
  }

  // 计算最佳弹出位置
  const calculatePlacement = (): "top" | "bottom" | "left" | "right" => {
    // 如果用户指定了位置，优先使用
    if (props.placement) return props.placement

    if (!triggerRef) return "bottom"

    const rect = triggerRef.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 计算各方向的可用空间
    const spaceTop = rect.top
    const spaceBottom = viewportHeight - rect.bottom
    const spaceLeft = rect.left
    const spaceRight = viewportWidth - rect.right

    // 估算弹出框大小（默认最小宽度 120px，高度根据内容）
    const popoverWidth = 120
    const popoverHeight = 100

    // 计算各方向的得分（空间越大得分越高，空间不足则为负分）
    const scores = {
      bottom: spaceBottom >= popoverHeight ? spaceBottom : -1000,
      top: spaceTop >= popoverHeight ? spaceTop : -1000,
      right: spaceRight >= popoverWidth ? spaceRight : -1000,
      left: spaceLeft >= popoverWidth ? spaceLeft : -1000,
    }

    // 选择得分最高的方向
    const best = Object.entries(scores).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0] as "top" | "bottom" | "left" | "right"

    return best
  }

  // 打开时计算位置
  createEffect(() => {
    if (isOpen()) {
      setAutoPlacement(calculatePlacement())
    }
  })

  const placementClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }

  // 使用用户指定的位置或自动计算的位置
  const currentPlacement = () => props.placement || autoPlacement()

  return (
    <div class="relative inline-flex" ref={triggerRef}>
      <div onClick={() => setOpen(!isOpen())}>
        {props.trigger}
      </div>
      <Show when={isOpen()}>
        <>
          {/* 透明遮罩，点击关闭 */}
          <div
            class="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            class={cn(
              "absolute z-50 bg-surface rounded-lg shadow-lg border border-border p-3 min-w-30",
              placementClasses[currentPlacement()],
              props.class,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {props.children}
          </div>
        </>
      </Show>
    </div>
  )
}
