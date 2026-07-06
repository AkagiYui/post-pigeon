// Dialog 模态框组件，封装 Kobalte Dialog
// Kobalte 提供焦点陷阱、滚动锁定、Portal 渲染与完整 ARIA（role="dialog"、aria-labelledby 等）。
// 默认关闭行为对齐旧实现：closeOnEsc / closeOnOverlayClick 默认为 false，
// 通过在 Content 上拦截 ESC 与外部交互事件实现。
import { Dialog as KDialog } from "@kobalte/core/dialog"
import { type JSX, Show, splitProps } from "solid-js"

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

  return (
    <KDialog
      open={local.open}
      onOpenChange={(isOpen) => {
        // Kobalte 仅在“允许的”关闭动作发生时回调 false（ESC / 外部点击被拦截时不会触发）
        if (!isOpen) local.onClose()
      }}
    >
      <KDialog.Portal>
        <KDialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
        <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <KDialog.Content
            class={cn(
              "pointer-events-auto bg-surface rounded-lg shadow-xl border border-border overflow-hidden flex flex-col outline-none",
              // 设置了高度用固定高度；否则用最大高度限制让内容自适应
              local.height ? "" : "max-h-[85vh]",
              local.class,
            )}
            style={{ width: local.width || "480px", height: local.height }}
            onEscapeKeyDown={(e) => {
              if (!local.closeOnEsc) e.preventDefault()
            }}
            onInteractOutside={(e) => {
              if (!local.closeOnOverlayClick) e.preventDefault()
            }}
          >
            {/* 标题栏 */}
            <Show when={local.title}>
              <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <KDialog.Title class="text-lg font-semibold text-foreground">{local.title}</KDialog.Title>
                <KDialog.CloseButton class="rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </KDialog.CloseButton>
              </div>
            </Show>
            {/* 内容区 */}
            <div class="overflow-auto flex-1">
              {local.children}
            </div>
          </KDialog.Content>
        </div>
      </KDialog.Portal>
    </KDialog>
  )
}
