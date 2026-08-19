// 应用级错误边界。
//
// 没有它时，渲染期抛出的任何异常都会让 Solid 卸载整棵树——用户看到的是一片空白，
// 且没有任何可操作的出口。这里给出错误摘要、可展开的堆栈，以及重试/重载入口。
import { Icon } from "@iconify-icon/solid"
import { createSignal, ErrorBoundary, type JSX, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { t } from "@/hooks/useI18n"
import { errorMessage } from "@/lib/errors"

function FallbackView(props: { error: unknown; reset: () => void }) {
  const [expanded, setExpanded] = createSignal(false)
  const stack = () => (props.error instanceof Error ? props.error.stack : String(props.error))

  return (
    <div class="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Icon icon="lucide:alert-octagon" class="h-10 w-10 text-red-500" />
      <div class="max-w-lg space-y-1.5">
        <h2 class="text-base font-medium text-foreground">{t("error.boundary.title")}</h2>
        <p class="text-sm text-muted-foreground break-words">{errorMessage(props.error)}</p>
      </div>

      <div class="flex items-center gap-2">
        <Button size="sm" onClick={props.reset}>{t("error.boundary.retry")}</Button>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          {t("error.boundary.reload")}
        </Button>
      </div>

      <Show when={stack()}>
        <button
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={expanded()}
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? t("common.hide") : t("error.showDetail")}
        </button>
        <Show when={expanded()}>
          <pre class="max-h-64 w-full max-w-2xl overflow-auto rounded-md bg-muted p-3 text-left text-[11px] leading-4 whitespace-pre-wrap break-all">
            {stack()}
          </pre>
        </Show>
      </Show>
    </div>
  )
}

/** 包住子树的错误边界；捕获后展示可恢复的错误页而不是白屏 */
export function AppErrorBoundary(props: { children: JSX.Element }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        console.error("界面渲染发生未捕获错误", error)
        return <FallbackView error={error} reset={reset} />
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
