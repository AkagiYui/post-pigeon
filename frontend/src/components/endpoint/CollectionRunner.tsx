// 集合运行器：按顺序跑一批接口，实时展示进度，结束后给出可导出的报告。
//
// 脚本引擎里的 pm.test 断言早已完整，这里补上的是「批量调度 + 结果汇总」，
// 让接口集合真正能当回归用例跑。
import { Icon } from "@iconify-icon/solid"
import { Events } from "@wailsio/runtime"
import { createSignal, For, onCleanup, Show } from "solid-js"

import type { RunItemResult, RunReport } from "@/../bindings/PostPigeon/internal/services"
import { RunnerService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { errorMessage } from "@/lib/errors"
import { cn, downloadTextFile } from "@/lib/utils"
import { toastError, toastSuccess } from "@/stores/toast"

/** 后端 runner:progress 事件载荷 */
interface RunProgressPayload {
  runId: string
  index: number
  total: number
  item: RunItemResult
}

export interface CollectionRunnerProps {
  open: boolean
  onClose: () => void
  /** 运行范围：模块或文件夹（二选一） */
  moduleId?: string
  folderId?: string
  /** 运行范围的显示名 */
  scopeName?: string
  /** 当前环境 ID */
  environmentId?: string
}

export function CollectionRunner(props: CollectionRunnerProps) {
  const [running, setRunning] = createSignal(false)
  const [runId, setRunId] = createSignal("")
  const [progress, setProgress] = createSignal<{ index: number; total: number }>({ index: 0, total: 0 })
  const [items, setItems] = createSignal<RunItemResult[]>([])
  const [report, setReport] = createSignal<RunReport | null>(null)

  const [iterations, setIterations] = createSignal(1)
  const [delayMs, setDelayMs] = createSignal(0)
  const [stopOnFailure, setStopOnFailure] = createSignal(false)

  // 订阅运行进度：只处理属于本次运行的事件
  const off = Events.On("runner:progress", (e: { data?: RunProgressPayload }) => {
    const payload = e?.data
    if (!payload || payload.runId !== runId()) return
    setProgress({ index: payload.index, total: payload.total })
    setItems((prev) => [...prev, payload.item])
  })
  onCleanup(() => { if (typeof off === "function") off() })

  const start = async () => {
    const id = crypto.randomUUID()
    setRunId(id)
    setItems([])
    setReport(null)
    setProgress({ index: 0, total: 0 })
    setRunning(true)
    try {
      const result = await RunnerService.RunCollection({
        runId: id,
        endpointIds: [],
        moduleId: props.moduleId || "",
        folderId: props.folderId || "",
        environmentId: props.environmentId || "",
        iterations: Math.max(1, Math.round(iterations())),
        delayMs: Math.max(0, Math.round(delayMs())),
        stopOnFailure: stopOnFailure(),
      })
      setReport(result)
      // 以最终报告为准，避免事件乱序或丢失导致列表与统计对不上
      if (result) setItems(result.items || [])
    } catch (e) {
      toastError(e, "error.op.runFailed")
    } finally {
      setRunning(false)
    }
  }

  const cancel = async () => {
    try {
      await RunnerService.CancelRun(runId())
    } catch (e) {
      toastError(e)
    }
  }

  const exportMarkdown = async () => {
    const current = report()
    if (!current) return
    try {
      const markdown = await RunnerService.ExportReportMarkdown(current)
      downloadTextFile(`${props.scopeName || "run"}-report.md`, markdown, "text/markdown")
      toastSuccess(t("importexport.exported"))
    } catch (e) {
      toastError(e, "error.op.exportFailed")
    }
  }

  const exportJSON = () => {
    const current = report()
    if (!current) return
    downloadTextFile(`${props.scopeName || "run"}-report.json`, JSON.stringify(current, null, 2), "application/json")
    toastSuccess(t("importexport.exported"))
  }

  const percent = () => {
    const { index, total } = progress()
    return total > 0 ? Math.round((index / total) * 100) : 0
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("runner.title")} width="720px" closeOnEsc>
      <div class="flex max-h-[70vh] flex-col">
        {/* 运行参数 */}
        <div class="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted-foreground">{t("runner.iterations")}</label>
            <Input
              size="sm" type="number" min="1" class="w-20"
              value={String(iterations())}
              onInput={(e) => setIterations(Number(e.currentTarget.value) || 1)}
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted-foreground">{t("runner.delay")}</label>
            <Input
              size="sm" type="number" min="0" class="w-24"
              value={String(delayMs())}
              onInput={(e) => setDelayMs(Number(e.currentTarget.value) || 0)}
            />
            <span class="text-xs text-muted-foreground">ms</span>
          </div>
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
            <Checkbox checked={stopOnFailure()} onChange={(e) => setStopOnFailure(e.currentTarget.checked)} />
            <span>{t("runner.stopOnFailure")}</span>
          </label>
        </div>

        {/* 进度 */}
        <Show when={running() || progress().total > 0}>
          <div class="space-y-1.5 border-b border-border px-6 py-3">
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("runner.progress", { done: progress().index, total: progress().total })}</span>
              <span class="tabular-nums">{percent()}%</span>
            </div>
            <div
              class="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent()}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div class="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent()}%` }} />
            </div>
          </div>
        </Show>

        {/* 汇总 */}
        <Show when={report()}>
          {(current) => (
            <div class="flex flex-wrap gap-3 border-b border-border px-6 py-3 text-sm">
              <Summary label={t("runner.requests")} value={`${current().succeeded}/${current().total}`} ok={current().failed === 0} />
              <Summary label={t("runner.assertions")} value={`${current().passedTests}/${current().totalTests}`} ok={current().failedTests === 0} />
              <Summary label={t("runner.duration")} value={`${Math.round(current().durationMs)} ms`} ok />
              <Show when={current().canceled}>
                <span class="text-xs text-amber-600">{t("runner.canceled")}</span>
              </Show>
            </div>
          )}
        </Show>

        {/* 结果明细 */}
        <div class="min-h-40 flex-1 overflow-auto px-6 py-3">
          <Show
            when={items().length > 0}
            fallback={<p class="py-8 text-center text-sm text-muted-foreground">{t("runner.empty")}</p>}
          >
            <ul class="space-y-1">
              <For each={items()}>
                {(item) => (
                  <li class="rounded-md border border-border px-3 py-2">
                    <div class="flex items-center gap-2">
                      <Icon
                        icon={item.passed ? "lucide:check-circle-2" : "lucide:x-circle"}
                        class={cn("h-4 w-4 shrink-0", item.passed ? "text-emerald-500" : "text-red-500")}
                      />
                      <span class="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                      <span class="shrink-0 font-mono text-xs text-muted-foreground">{item.method}</span>
                      <span class={cn("shrink-0 tabular-nums text-xs", item.statusCode >= 400 ? "text-red-500" : "text-muted-foreground")}>
                        {item.statusCode || "-"}
                      </span>
                      <span class="shrink-0 tabular-nums text-xs text-muted-foreground">{Math.round(item.durationMs)} ms</span>
                    </div>
                    <Show when={item.error}>
                      <p class="mt-1 pl-6 text-xs text-red-500">{errorMessage(item.error)}</p>
                    </Show>
                    <Show when={item.tests?.length}>
                      <ul class="mt-1 space-y-0.5 pl-6">
                        <For each={item.tests}>
                          {(test) => (
                            <li class={cn("text-xs", test.passed ? "text-muted-foreground" : "text-red-500")}>
                              {test.passed ? "✓" : "✗"} {test.name}
                              <Show when={test.error}><span class="ml-1 opacity-80">— {test.error}</span></Show>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-border px-6 py-3">
        <div class="flex gap-2">
          <Show when={report()}>
            <Button size="sm" variant="outline" onClick={exportMarkdown}>{t("runner.exportMarkdown")}</Button>
            <Button size="sm" variant="outline" onClick={exportJSON}>{t("runner.exportJson")}</Button>
          </Show>
        </div>
        <div class="flex gap-2">
          <Button size="sm" variant="outline" onClick={props.onClose}>{t("common.close")}</Button>
          <Show
            when={!running()}
            fallback={<Button size="sm" variant="destructive" onClick={cancel}>{t("runner.cancel")}</Button>}
          >
            <Button size="sm" onClick={start}>
              <Icon icon="lucide:play" class="h-3.5 w-3.5" />
              {t("runner.start")}
            </Button>
          </Show>
        </div>
      </div>
    </Dialog>
  )
}

/** 汇总统计的一个小块 */
function Summary(props: { label: string; value: string; ok: boolean }) {
  return (
    <span class="inline-flex items-center gap-1.5">
      <span class="text-xs text-muted-foreground">{props.label}</span>
      <span class={cn("font-medium tabular-nums", props.ok ? "text-emerald-600" : "text-red-500")}>{props.value}</span>
    </span>
  )
}
