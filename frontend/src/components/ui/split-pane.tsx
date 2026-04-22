// SplitPane 分割面板组件，支持拖拽调整大小
import { createSignal, type JSX, onCleanup, Show, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface SplitPaneProps {
  /** 左侧面板内容 */
  left: JSX.Element
  /** 右侧面板内容 */
  right: JSX.Element
  /** 初始左侧宽度（像素或百分比） */
  defaultSize?: number
  /** 最小左侧宽度（像素） */
  minSize?: number
  /** 最大左侧宽度（像素） */
  maxSize?: number
  /** 左侧是否折叠 */
  collapsed?: boolean
  /** 折叠变更回调 */
  onCollapsedChange?: (collapsed: boolean) => void
  /** 自定义类名 */
  class?: string
}

/**
 * SplitPane 水平分割面板组件
 * 支持拖拽调整左右面板宽度
 */
export function SplitPane(props: SplitPaneProps) {
  const [local] = splitProps(props, ["left", "right", "defaultSize", "minSize", "maxSize", "collapsed", "onCollapsedChange", "class"])
  const [size, setSize] = createSignal(local.defaultSize || 280)
  const [dragging, setDragging] = createSignal(false)

  const handleMouseDown = (e: MouseEvent) => {
    if (local.collapsed) return
    e.preventDefault()
    setDragging(true)

    const startX = e.clientX
    const startSize = size()

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newSize = Math.max(
        local.minSize || 150,
        Math.min(local.maxSize || 600, startSize + diff),
      )
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  onCleanup(() => {
    setDragging(false)
  })

  return (
    <div class={cn("flex h-full relative", local.class)}>
      {/* 左侧面板 */}
      <Show when={!local.collapsed}>
        <div
          class="shrink-0 overflow-hidden"
          style={{ width: `${size()}px` }}
        >
          {local.left}
        </div>
        {/* 分割条 */}
        <div
          class={cn(
            "w-0.5 shrink-0 cursor-col-resize bg-border hover:bg-accent/30 transition-colors relative group",
            dragging() && "bg-accent/50",
          )}
          onMouseDown={handleMouseDown}
        >
          {/* 拖拽提示线 */}
          <Show when={dragging()}>
            <div class="absolute inset-y-0 -left-0.5 -right-0.5 bg-accent/10 z-10" />
          </Show>
        </div>
      </Show>

      {/* 右侧面板 */}
      <div class="flex-1 overflow-hidden relative">
        {local.right}
        {/* 折叠时的展开按钮 */}
        <Show when={local.collapsed}>
          <button
            class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-surface border border-border rounded-r-md p-1 hover:bg-muted transition-colors"
            onClick={() => local.onCollapsedChange?.(false)}
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </Show>
      </div>
    </div>
  )
}
