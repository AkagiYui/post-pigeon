// 应用更新面板：检查、下载、安装，以及跨版本的变更日志。
//
// 更新流程本身跑在 Go 侧（Wails 内置 updater），这里只负责发起动作和渲染
// stores/updater.ts 收敛出来的状态。变更日志是结构化数据而非 Markdown，
// 所以不需要引入 Markdown 渲染器，样式也和应用其它地方保持一致。
import { Icon } from "@iconify-icon/solid"
import { createSignal, For, Match, onMount, Show, Switch } from "solid-js"

import type { Entry } from "@/../bindings/PostPigeon/internal/changelog"
import { UpdateSettings as UpdateSettingsModel } from "@/../bindings/PostPigeon/internal/models"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ExternalLink } from "@/components/ui/external-link"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"
import {
  checkForUpdate,
  downloadAndInstall,
  loadPendingChangelog,
  loadUpdateHistory,
  pendingChangelog,
  refreshUpdateInfo,
  restartToApply,
  saveUpdateSettings,
  skipAvailableVersion,
  updateError,
  updateHistory,
  updateInfo,
  updateProgress,
  updateState,
} from "@/stores/updater"

/** 破坏性变更与安全相关的分类需要更醒目：这是用户唯一必须读完的部分 */
const CRITICAL_SECTION = /破坏|不兼容|安全|移除|breaking|security|removed/i

/** 字节数格式化为可读大小 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—"
  const units = ["B", "KiB", "MiB", "GiB"]
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function UpdateSettings() {
  const [busy, setBusy] = createSignal(false)
  const [historyOpen, setHistoryOpen] = createSignal(false)

  const info = updateInfo
  const settings = () => info()?.settings
  const available = () => info()?.available ?? null
  const releasesUrl = () => info()?.releasesUrl ?? ""

  onMount(async () => {
    try {
      const current = await refreshUpdateInfo()
      // 后台定时检查可能已经发现了新版本，进面板时把变更日志补上
      if (current?.available) void loadPendingChangelog()
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  })

  /** 包一层：更新类操作都是「置忙 → 执行 → 出错弹提示」的同一套 */
  const run = async (action: () => Promise<void>, fallbackKey: string) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      toastError(e, fallbackKey)
    } finally {
      setBusy(false)
    }
  }

  const onCheck = () => run(async () => {
    const next = await checkForUpdate()
    if (!next.available) toastSuccess(t("update.upToDate"))
  }, "error.op.loadFailed")

  const onDownload = () => run(() => downloadAndInstall(), "error.op.loadFailed")

  const onRestart = () => run(() => restartToApply(), "error.op.loadFailed")

  const onSkip = () => run(async () => {
    const version = available()?.version ?? ""
    await skipAvailableVersion()
    toastSuccess(t("update.skipped", { version }))
  }, "error.op.saveFailed")

  const onToggle = (patch: Partial<UpdateSettingsModel>) => {
    const current = settings()
    if (!current) return
    void run(
      () => saveUpdateSettings(new UpdateSettingsModel({ ...current, ...patch })),
      "error.op.saveFailed",
    )
  }

  const onToggleHistory = async () => {
    if (!historyOpen()) {
      try {
        await loadUpdateHistory()
      } catch (e) {
        toastError(e, "error.op.loadFailed")
        return
      }
    }
    setHistoryOpen(!historyOpen())
  }

  /** 下载进度百分比；总大小未知时返回 null（渲染成不确定进度） */
  const percent = () => {
    const p = updateProgress()
    if (!p || p.total <= 0) return null
    return Math.min(100, Math.round((p.written / p.total) * 100))
  }

  return (
    <div class="flex h-full flex-col gap-4">
      <div>
        <h2 class="text-base font-medium">{t("settings.update")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("update.hint")}</p>
      </div>

      <div class="min-h-0 flex-1 space-y-5 overflow-auto pr-1">
        {/* 版本与检查入口 */}
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm text-muted-foreground">{t("update.currentVersion")}</div>
            <div class="font-mono text-sm text-foreground">{info()?.currentVersion || t("common.unknown")}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onCheck}
            disabled={busy() || !info()?.enabled || updateState() === "checking"}
          >
            {updateState() === "checking" ? t("update.checking") : t("update.check")}
          </Button>
        </div>

        {/* 更新器不可用：说明原因并给出下载页入口。
            info() 为 null 时是还没加载完，此时不要闪一下「无法更新」 */}
        <Show when={info() && !info()!.canSelfUpdate}>
          <div class="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div class="flex items-start gap-2">
              <Icon icon="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="space-y-2">
                <p class="text-muted-foreground">{t(`update.blocked.${info()?.blockedReason || "unknown"}`)}</p>
                <Show when={releasesUrl()}>
                  <ExternalLink href={releasesUrl()} text={t("update.downloadPage")} />
                </Show>
              </div>
            </div>
          </div>
        </Show>

        {/* 状态区 */}
        <Switch>
          <Match when={updateState() === "up-to-date"}>
            <StatusLine icon="lucide:check-circle-2" tone="success" text={t("update.upToDate")} />
          </Match>

          <Match when={updateState() === "downloading"}>
            <div class="space-y-2">
              <StatusLine
                icon="lucide:download"
                text={percent() === null ? t("update.downloadingUnknown") : t("update.downloading", { percent: percent()! })}
              />
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-accent transition-[width] duration-200"
                  classList={{ "animate-pulse w-1/3": percent() === null }}
                  style={percent() === null ? undefined : { width: `${percent()}%` }}
                />
              </div>
              <Show when={updateProgress()}>
                {(p) => (
                  <div class="text-xs text-muted-foreground">
                    {formatBytes(p().written)} / {formatBytes(p().total)}
                  </div>
                )}
              </Show>
            </div>
          </Match>

          <Match when={updateState() === "verifying"}>
            <StatusLine icon="lucide:shield-check" text={t("update.verifying")} />
          </Match>

          <Match when={updateState() === "installing"}>
            <StatusLine icon="lucide:package" text={t("update.installing")} />
          </Match>

          <Match when={updateState() === "ready"}>
            <div class="space-y-2">
              <StatusLine icon="lucide:check-circle-2" tone="success" text={t("update.ready")} />
              <Button size="sm" onClick={onRestart} disabled={busy()}>{t("update.restart")}</Button>
            </div>
          </Match>

          <Match when={updateState() === "error"}>
            <div class="space-y-2">
              <StatusLine icon="lucide:alert-circle" tone="error" text={t("update.failed")} />
              <Show when={updateError()}>
                <p class="font-mono text-xs break-all text-muted-foreground">{updateError()}</p>
              </Show>
              <Button size="sm" variant="outline" onClick={onCheck} disabled={busy()}>{t("update.retry")}</Button>
            </div>
          </Match>
        </Switch>

        {/* 可用的新版本 */}
        <Show when={available()}>
          {(release) => (
            <div class="space-y-3 rounded-md border border-accent/40 bg-accent-muted/30 p-3">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <div class="text-sm font-medium">
                  {t("update.available", { version: release().version })}
                </div>
                <div class="text-xs text-muted-foreground">
                  {[release().publishedAt ? new Date(release().publishedAt).toLocaleDateString() : "", formatBytes(release().size)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <Show when={info()?.canSelfUpdate}>
                  <Button
                    size="sm"
                    onClick={onDownload}
                    disabled={busy() || ["downloading", "verifying", "installing", "ready"].includes(updateState())}
                  >
                    {t("update.download")}
                  </Button>
                </Show>
                <Button size="sm" variant="outline" onClick={onSkip} disabled={busy()}>
                  {t("update.skip")}
                </Button>
                <ExternalLink href={release().url} text={t("update.releasePage")} />
              </div>

              {/* 跨版本变更日志：当前版本到新版本之间的每一个版本都要列出来 */}
              <Show when={pendingChangelog()}>
                {(log) => (
                  <div class="space-y-2 border-t border-border/60 pt-3">
                    <div class="text-xs font-medium text-muted-foreground">{t("update.changes")}</div>
                    <Show
                      when={log().entries.length > 0}
                      fallback={
                        <p class="text-xs whitespace-pre-wrap text-muted-foreground">
                          {log().fallback || t("update.noChanges")}
                        </p>
                      }
                    >
                      <ChangelogList entries={log().entries} />
                    </Show>
                  </div>
                )}
              </Show>
            </div>
          )}
        </Show>

        {/* 设置项 */}
        <div class="space-y-3 border-t border-border pt-4">
          <div class="space-y-1.5">
            <label class="flex cursor-pointer items-center gap-2 text-sm select-none">
              <Checkbox
                checked={settings()?.autoCheck ?? true}
                disabled={busy()}
                onChange={(e) => onToggle({ autoCheck: e.currentTarget.checked })}
              />
              <span class="font-medium">{t("update.autoCheck")}</span>
            </label>
            <p class="pl-6 text-xs text-muted-foreground">{t("update.autoCheck.hint")}</p>
          </div>

          <div class="space-y-1.5">
            <label class="flex cursor-pointer items-center gap-2 text-sm select-none">
              <Checkbox
                checked={settings()?.includePrerelease ?? false}
                disabled={busy()}
                onChange={(e) => onToggle({ includePrerelease: e.currentTarget.checked })}
              />
              <span class="font-medium">{t("update.prerelease")}</span>
            </label>
            <p class="pl-6 text-xs text-muted-foreground">{t("update.prerelease.hint")}</p>
          </div>

          <Show when={settings()?.skippedVersion}>
            {(version) => (
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-muted-foreground">{t("update.skipped", { version: version() })}</span>
                <Button size="sm" variant="ghost" onClick={() => onToggle({ skippedVersion: "" })} disabled={busy()}>
                  {t("update.unskip")}
                </Button>
              </div>
            )}
          </Show>
        </div>

        {/* 本机内置的完整更新日志 */}
        <div class="border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={onToggleHistory}>
            <Icon icon={historyOpen() ? "lucide:chevron-down" : "lucide:chevron-right"} class="h-4 w-4" />
            {t("update.history")}
          </Button>
          <Show when={historyOpen()}>
            <div class="mt-2">
              <Show
                when={(updateHistory()?.length ?? 0) > 0}
                fallback={<p class="text-xs text-muted-foreground">{t("common.noData")}</p>}
              >
                <ChangelogList entries={updateHistory()!} />
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

/** 状态行：一个图标加一句话 */
function StatusLine(props: { icon: string; text: string; tone?: "success" | "error" }) {
  return (
    <div
      class="flex items-center gap-2 text-sm"
      classList={{
        "text-green-600 dark:text-green-400": props.tone === "success",
        "text-red-500": props.tone === "error",
        "text-muted-foreground": !props.tone,
      }}
    >
      <Icon icon={props.icon} class="h-4 w-4" />
      <span>{props.text}</span>
    </div>
  )
}

/**
 * 变更日志列表。第一个版本默认展开，其余折叠——跨多个版本升级时平铺全部内容
 * 会淹没重点，而最新一版通常是用户最关心的。
 */
function ChangelogList(props: { entries: Entry[] }) {
  return (
    <div class="space-y-1">
      <For each={props.entries}>
        {(entry, index) => (
          <details open={index() === 0} class="group rounded-md border border-border/60">
            <summary class="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm select-none">
              <Icon
                icon="lucide:chevron-right"
                class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              />
              <span class="font-mono font-medium">{entry.version}</span>
              <Show when={entry.date}>
                <span class="text-xs text-muted-foreground">{entry.date}</span>
              </Show>
            </summary>
            <div class="space-y-2 px-2.5 pt-1 pb-2.5">
              <For each={entry.sections}>
                {(section) => (
                  <div class="space-y-1">
                    <Show when={section.title}>
                      <div
                        class="text-xs font-medium"
                        classList={{
                          "text-red-500": CRITICAL_SECTION.test(section.title),
                          "text-muted-foreground": !CRITICAL_SECTION.test(section.title),
                        }}
                      >
                        {section.title}
                      </div>
                    </Show>
                    <ul class="ml-4 list-disc space-y-0.5 text-xs text-foreground marker:text-muted-foreground">
                      <For each={section.items}>{(item) => <li>{item}</li>}</For>
                    </ul>
                  </div>
                )}
              </For>
            </div>
          </details>
        )}
      </For>
    </div>
  )
}
