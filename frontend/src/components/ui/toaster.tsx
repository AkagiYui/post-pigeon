// Toast 渲染层：挂在应用根部，读取全局 toast store 并渲染到右下角。
import { Icon } from "@iconify-icon/solid"
import { createSignal, For, Show } from "solid-js"

import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { dismissToast, type Toast, type ToastKind, toasts } from "@/stores/toast"

/** 各类型对应的图标与配色 */
const KIND_STYLE: Record<ToastKind, { icon: string; accent: string }> = {
  success: { icon: "lucide:check-circle-2", accent: "text-emerald-500" },
  error: { icon: "lucide:alert-circle", accent: "text-red-500" },
  warning: { icon: "lucide:alert-triangle", accent: "text-amber-500" },
  info: { icon: "lucide:info", accent: "text-accent" },
}

function ToastItem(props: { toast: Toast }) {
  const [expanded, setExpanded] = createSignal(false)
  const style = () => KIND_STYLE[props.toast.kind]

  return (
    <div
      // role=alert 让屏幕阅读器在提示出现时立即播报
      role="alert"
      aria-live={props.toast.kind === "error" ? "assertive" : "polite"}
      class={cn(
        "toast-item pointer-events-auto w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
      )}
    >
      <div class="flex items-start gap-2.5 p-3">
        <Icon icon={style().icon} class={cn("mt-0.5 h-4 w-4 shrink-0", style().accent)} />
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-5 break-words">{props.toast.message}</p>
          <Show when={props.toast.detail}>
            <button
              type="button"
              class="mt-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={expanded()}
              onClick={() => setExpanded(!expanded())}
            >
              {expanded() ? t("common.hide") : t("error.showDetail")}
            </button>
            <Show when={expanded()}>
              <pre class="mt-1.5 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px] leading-4 whitespace-pre-wrap break-all">
                {props.toast.detail}
              </pre>
            </Show>
          </Show>
        </div>
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("common.close")}
          onClick={() => dismissToast(props.toast.id)}
        >
          <Icon icon="lucide:x" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/** 全局 Toast 容器，应用根部渲染一次即可 */
export function Toaster() {
  return (
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2"
      // 容器本身作为状态区域，内部每条再各自 role=alert
      role="region"
      aria-label={t("error.notifications")}
    >
      <For each={toasts()}>{(item) => <ToastItem toast={item} />}</For>
    </div>
  )
}
