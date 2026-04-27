// Popover 气泡弹出组件
// 使用 fixed 定位而非 absolute，避免被父容器的 overflow 裁剪
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
 * 使用 fixed 定位基于触发元素视口坐标计算位置，避免被父容器 overflow 裁剪
 */
export function Popover(props: PopoverProps) {
  const [internalOpen, setInternalOpen] = createSignal(false)
  const isOpen = () => props.open !== undefined ? props.open : internalOpen()
  let triggerRef: HTMLDivElement | undefined
  const [position, setPosition] = createSignal({ left: 0, top: 0 })
  const [autoPlacement, setAutoPlacement] = createSignal<"top" | "bottom" | "left" | "right">("bottom")

  const setOpen = (val: boolean) => {
    setInternalOpen(val)
    props.onOpenChange?.(val)
  }

  // 计算最佳弹出位置和坐标
  const updatePosition = () => {
    if (!triggerRef) return

    const rect = triggerRef.getBoundingClientRect()
    const placement = props.placement || calculateBestPlacement(rect)

    setAutoPlacement(placement)

    // 根据 placement 计算弹出框的 left/top
    switch (placement) {
      case "bottom":
        setPosition({ left: rect.left + rect.width / 2, top: rect.bottom + 4 })
        break
      case "top":
        setPosition({ left: rect.left + rect.width / 2, top: rect.top - 4 })
        break
      case "left":
        setPosition({ left: rect.left - 4, top: rect.top + rect.height / 2 })
        break
      case "right":
        setPosition({ left: rect.right + 4, top: rect.top + rect.height / 2 })
        break
    }
  }

  // 计算最佳弹出位置
  const calculateBestPlacement = (rect: DOMRect): "top" | "bottom" | "left" | "right" => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const spaceTop = rect.top
    const spaceBottom = viewportHeight - rect.bottom
    const spaceLeft = rect.left
    const spaceRight = viewportWidth - rect.right

    const popoverWidth = 120
    const popoverHeight = 100

    const scores = {
      bottom: spaceBottom >= popoverHeight ? spaceBottom : -1000,
      top: spaceTop >= popoverHeight ? spaceTop : -1000,
      right: spaceRight >= popoverWidth ? spaceRight : -1000,
      left: spaceLeft >= popoverWidth ? spaceLeft : -1000,
    }

    return Object.entries(scores).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0] as "top" | "bottom" | "left" | "right"
  }

  // 打开时计算位置
  createEffect(() => {
    if (isOpen()) {
      updatePosition()
    }
  })

  // 根据 placement 计算 transform 偏移，用于居中/居中对齐
  const getTransform = (placement: "top" | "bottom" | "left" | "right") => {
    switch (placement) {
      case "bottom":
      case "top":
        return "translateX(-50%)"
      case "left":
      case "right":
        return "translateY(-50%)"
    }
  }

  // 根据 placement 计算 margin，制造间距
  const getMargin = (placement: "top" | "bottom" | "left" | "right") => {
    switch (placement) {
      case "bottom": return "margin-top: 4px;"
      case "top": return "margin-bottom: 4px;"
      case "right": return "margin-left: 4px;"
      case "left": return "margin-right: 4px;"
    }
  }

  const currentPlacement = () => props.placement || autoPlacement()

  return (
    <div class="inline-flex" ref={triggerRef}>
      <div onClick={() => { if (!isOpen()) updatePosition(); setOpen(!isOpen()) }}>
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
              "fixed z-50 bg-surface rounded-lg shadow-lg border border-border p-3 min-w-30",
              props.class,
            )}
            style={{
              left: `${position().left}px`,
              top: `${position().top}px`,
              transform: getTransform(currentPlacement()),
              margin: currentPlacement() === "bottom" ? "4px 0 0 0"
                : currentPlacement() === "top" ? "0 0 4px 0"
                  : currentPlacement() === "right" ? "0 0 0 4px"
                    : "0 4px 0 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {props.children}
          </div>
        </>
      </Show>
    </div>
  )
}
