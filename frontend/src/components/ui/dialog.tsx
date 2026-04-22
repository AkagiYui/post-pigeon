// Dialog 模态框组件
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
}

/**
 * Dialog 模态框组件
 */
export function Dialog(props: DialogProps) {
  const [local] = splitProps(props, ["open", "onClose", "title", "class", "children", "width"])

  return (
    <Show when={local.open}>
      {/* 遮罩层 */}
      <div
        class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        onClick={local.onClose}
      >
        {/* 对话框内容 */}
        <div
          class={cn(
            "bg-surface rounded-lg shadow-xl border border-border h-[85vh] overflow-hidden flex flex-col",
            local.class,
          )}
          style={{ width: local.width || "480px" }}
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
