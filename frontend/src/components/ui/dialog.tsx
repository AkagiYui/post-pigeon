// Dialog 模态框组件
import { createEffect, type JSX, on, Show, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface DialogProps {
  /** 是否显示 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 标题 */
  title?: string
  /** 自定义类名 */
  class?: string
  /** 子内容 */
  children: JSX.Element
  /** 宽度 */
  width?: string
  /** 高度，不设置则根据内容自动调整 */
  height?: string
  /** 点击遮罩层是否触发关闭回调，默认为 false */
  closeOnOverlayClick?: boolean
  /** 按 ESC 键是否触发关闭回调，默认为 false */
  closeOnEsc?: boolean
}

/**
 * Dialog 模态框组件
 */
export function Dialog(props: DialogProps) {
  const [local] = splitProps(props, ["open", "onClose", "title", "class", "children", "width", "height", "closeOnOverlayClick", "closeOnEsc"])

  // 遮罩层元素引用，用于自动聚焦
  let overlayRef: HTMLDivElement | undefined

  // 模态框打开时自动聚焦，确保 ESC 键可以立即响应
  createEffect(on(
    () => local.open,
    (isOpen) => {
      if (isOpen && overlayRef) {
        // 延迟聚焦，确保 DOM 已渲染
        setTimeout(() => overlayRef?.focus(), 0)
      }
    },
    { defer: true },
  ))

  // 处理 ESC 键关闭
  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.closeOnEsc && e.key === "Escape") {
      local.onClose()
    }
  }

  return (
    <Show when={local.open}>
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center outline-none"
        onClick={local.closeOnOverlayClick ? local.onClose : undefined}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* 对话框内容 */}
        <div
          class={cn(
            "bg-surface rounded-lg shadow-xl border border-border overflow-hidden flex flex-col",
            // 如果设置了高度，使用固定高度；否则使用最大高度限制，让内容自适应
            local.height ? "" : "max-h-[85vh]",
            local.class,
          )}
          style={{ width: local.width || "480px", height: local.height }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          <Show when={local.title}>
            <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 class="text-lg font-semibold text-foreground">{local.title}</h2>
              <button
                class="rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={local.onClose}
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Show>
          {/* 内容区 */}
          <div class="overflow-auto flex-1">
            {local.children}
          </div>
        </div>
      </div>
    </Show>
  )
}
