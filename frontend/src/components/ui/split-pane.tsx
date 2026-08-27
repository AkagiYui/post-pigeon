// SplitPane 分割面板组件，支持拖拽调整大小
import { createSignal, type JSX, onCleanup, Show, splitProps } from "solid-js"

import { dragDisplaySize, resolveDragEnd, willCollapse } from "@/components/ui/split-pane-drag"
import { t } from "@/hooks/useI18n"
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
  /** 从最小宽度再往里拖多少像素，松手即收起 */
  collapseThreshold?: number
  /** 自定义类名 */
  class?: string
}

/**
 * SplitPane 水平分割面板组件
 * 支持拖拽调整左右面板宽度
 */
export function SplitPane(props: SplitPaneProps) {
  const [local] = splitProps(props, ["left", "right", "defaultSize", "minSize", "maxSize", "collapsed", "onCollapsedChange", "collapseThreshold", "class"])
  const [size, setSize] = createSignal(local.defaultSize || 280)
  const [dragging, setDragging] = createSignal(false)
  // 已经拖过「松手即收起」的距离：松手之前先把结果预告出来
  const [collapseArmed, setCollapseArmed] = createSignal(false)

  const minSize = () => local.minSize || 150
  const maxSize = () => local.maxSize || 600
  const threshold = () => local.collapseThreshold ?? 60

  const handleMouseDown = (e: MouseEvent) => {
    if (local.collapsed) return
    e.preventDefault()
    setDragging(true)

    const startX = e.clientX
    const startSize = size()
    // raw 是不受最小宽度约束的「意图宽度」：面板停在最小宽度不动，但还得知道
    // 用户往里拖了多远，才能判断松手时是弹回还是收起
    let raw = startSize

    const handleMouseMove = (e: MouseEvent) => {
      raw = startSize + (e.clientX - startX)
      setSize(dragDisplaySize(raw, minSize(), maxSize()))
      setCollapseArmed(willCollapse(raw, minSize(), threshold()))
    }

    const handleMouseUp = () => {
      setDragging(false)
      setCollapseArmed(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)

      const outcome = resolveDragEnd(raw, minSize(), maxSize(), threshold())
      setSize(outcome.size)
      if (outcome.collapsed) local.onCollapsedChange?.(true)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  /** 键盘调整：方向键按步进移动，Home/End 直接到最小/最大 */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.collapsed) return
    const min = minSize()
    const max = maxSize()
    const step = e.shiftKey ? 50 : 10
    let next: number | null = null
    switch (e.key) {
      // 已经贴着最小宽度还继续往左，等价于拖过头：直接收起
      case "ArrowLeft":
        if (size() <= min) { local.onCollapsedChange?.(true); e.preventDefault(); return }
        next = size() - step
        break
      case "ArrowRight": next = size() + step; break
      case "Home": next = min; break
      case "End": next = max; break
      case "Enter": local.onCollapsedChange?.(true); e.preventDefault(); return
      default: return
    }
    e.preventDefault()
    setSize(Math.max(min, Math.min(max, next)))
  }

  onCleanup(() => {
    setDragging(false)
  })

  return (
    <div class={cn("flex h-full relative", local.class)}>
      {/* 左侧面板 */}
      <Show when={!local.collapsed}>
        <div
          class={cn(
            "shrink-0 overflow-hidden",
            // 松手就会收起时先淡出，给一个「再拖就没了」的预告
            collapseArmed() && "opacity-50 transition-opacity",
          )}
          style={{ width: `${size()}px` }}
        >
          {local.left}
        </div>
        {/* 分割条 */}
        {/* 分隔条：以 separator 语义暴露当前/最小/最大值，并支持键盘调整，
            否则只有能精确拖拽鼠标的用户才改得动面板宽度 */}
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={t("splitPane.resize")}
          aria-valuenow={Math.round(size())}
          aria-valuemin={minSize()}
          aria-valuemax={maxSize()}
          class={cn(
            "w-px shrink-0 cursor-col-resize bg-border hover:bg-accent/30 transition-colors relative",
            "focus-visible:outline-none focus-visible:bg-accent",
            dragging() && "bg-accent/50",
            collapseArmed() && "bg-accent",
          )}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
        >
          {/* 扩展可点击区域（不可见） */}
          <div class="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
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
            type="button"
            aria-label={t("splitPane.expand")}
            class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-surface border border-border rounded-r-md p-1 hover:bg-muted transition-colors"
            onClick={() => local.onCollapsedChange?.(false)}
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </Show>
      </div>
    </div>
  )
}
