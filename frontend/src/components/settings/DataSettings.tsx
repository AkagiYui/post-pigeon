// 数据维护面板：数据库有多大、放在哪、怎么拿回来。
//
// 无服务端应用没有运维入口，用户对自己的数据是「看不见也拿不到」的：
// 清理历史后文件不会变小（SQLite 的页进 freelist 但不还给磁盘）、自动备份躺在
// 数据目录里没人知道、换电脑只能自己去翻 Finder。这一页就是把这些摆到台面上。
import { createSignal, For, onMount, Show } from "solid-js"

import type { BackupFile } from "@/../bindings/PostPigeon/internal/database/models"
import { DataService } from "@/../bindings/PostPigeon/internal/services"
import type { DatabaseInfo } from "@/../bindings/PostPigeon/internal/services/models"
import { Button } from "@/components/ui/button"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

import { formatBytes } from "./data-format"

/** 只读的信息行 */
function InfoRow(props: { label: string, value: string, hint?: string }) {
  return (
    <div class="space-y-1">
      <div class="flex items-baseline justify-between gap-4">
        <span class="text-sm font-medium">{props.label}</span>
        <span class="truncate font-mono text-sm text-muted-foreground">{props.value}</span>
      </div>
      <Show when={props.hint}>
        <p class="break-all text-xs text-muted-foreground">{props.hint}</p>
      </Show>
    </div>
  )
}

export function DataSettings() {
  const [info, setInfo] = createSignal<DatabaseInfo | null>(null)
  const [backups, setBackups] = createSignal<BackupFile[]>([])
  const [pending, setPending] = createSignal("")
  const [crashed, setCrashed] = createSignal(false)
  const [busy, setBusy] = createSignal("")
  // 恢复是覆盖性操作，沿用本项目「再点一次确认」的交互，不额外弹窗
  const [confirming, setConfirming] = createSignal("")

  const load = async () => {
    try {
      const [nextInfo, nextBackups, nextPending, nextCrashed] = await Promise.all([
        DataService.GetDatabaseInfo(),
        DataService.ListBackups(),
        DataService.GetPendingRestore(),
        DataService.GetLastRunCrashed(),
      ])
      setInfo(nextInfo)
      setBackups(nextBackups || [])
      setPending(nextPending)
      setCrashed(nextCrashed)
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  onMount(load)

  const compact = async () => {
    setBusy("compact")
    const before = info()?.sizeBytes ?? 0
    try {
      const next = await DataService.CompactDatabase()
      setInfo(next)
      toastSuccess(t("data.compacted", { size: formatBytes(Math.max(0, before - next.sizeBytes)) }))
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setBusy("")
    }
  }

  const openDir = async () => {
    try {
      await DataService.OpenDataDir()
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  const exportAll = async () => {
    setBusy("export")
    try {
      const path = await DataService.ExportData()
      if (path) toastSuccess(t("data.exported", { path }))
    } catch (e) {
      toastError(e, "error.op.exportFailed")
    } finally {
      setBusy("")
    }
  }

  const restore = async (path: string) => {
    if (confirming() !== path) {
      setConfirming(path)
      return
    }
    setConfirming("")
    setBusy("restore")
    try {
      await DataService.RestoreBackup(path)
      await load()
      toastSuccess(t("data.restore.staged"))
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    } finally {
      setBusy("")
    }
  }

  const pickFile = async () => {
    setBusy("restore")
    try {
      const path = await DataService.PickBackupFile()
      if (path) {
        await load()
        toastSuccess(t("data.restore.staged"))
      }
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    } finally {
      setBusy("")
    }
  }

  const exportDiagnostics = async () => {
    setBusy("diagnostics")
    try {
      const path = await DataService.ExportDiagnostics()
      if (path) toastSuccess(t("data.exported", { path }))
    } catch (e) {
      toastError(e, "error.op.exportFailed")
    } finally {
      setBusy("")
    }
  }

  const cancelRestore = async () => {
    try {
      await DataService.CancelRestore()
      await load()
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  return (
    <div class="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <p class="text-xs text-muted-foreground">{t("data.hint")}</p>

      {/* 体积与压缩 */}
      <div class="space-y-3 rounded-md border border-border p-3">
        <InfoRow label={t("data.dbSize")} value={formatBytes(info()?.sizeBytes ?? 0)} />
        <InfoRow
          label={t("data.reclaimable")}
          value={formatBytes(info()?.reclaimableBytes ?? 0)}
          hint={t("data.reclaimable.hint")}
        />
        <Button size="sm" variant="outline" onClick={compact} disabled={busy() !== ""}>
          {busy() === "compact" ? t("data.compacting") : t("data.compact")}
        </Button>
      </div>

      {/* 数据目录与导出 */}
      <div class="space-y-3 rounded-md border border-border p-3">
        <InfoRow label={t("data.dataDir")} value="" hint={info()?.dataDir} />
        <div class="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={openDir} disabled={busy() !== ""}>
            {t("data.openDir")}
          </Button>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={busy() !== ""}>
            {busy() === "export" ? t("data.exporting") : t("data.export")}
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">{t("data.export.hint")}</p>
      </div>

      {/* 诊断信息 */}
      <div class="space-y-3 rounded-md border border-border p-3">
        <div class="text-sm font-medium">{t("data.diagnostics.title")}</div>
        <Show when={crashed()}>
          <p class="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
            {t("data.crash.notice")}
          </p>
        </Show>
        <p class="text-xs text-muted-foreground">{t("data.diagnostics.hint")}</p>
        <Button size="sm" variant="outline" onClick={exportDiagnostics} disabled={busy() !== ""}>
          {busy() === "diagnostics" ? t("data.exporting") : t("data.diagnostics.export")}
        </Button>
      </div>

      {/* 从备份恢复 */}
      <div class="space-y-3 rounded-md border border-border p-3">
        <div class="text-sm font-medium">{t("data.restore.title")}</div>
        <p class="text-xs text-muted-foreground">{t("data.restore.hint")}</p>

        <Show when={pending() !== ""}>
          <div class="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-2">
            <p class="text-xs">{t("data.restore.pending")}</p>
            <div class="flex items-center gap-2">
              <Button size="sm" onClick={() => DataService.QuitApp()}>{t("data.restore.quit")}</Button>
              <Button size="sm" variant="outline" onClick={cancelRestore}>{t("data.restore.cancelPending")}</Button>
            </div>
          </div>
        </Show>

        <Show
          when={backups().length > 0}
          fallback={<p class="text-xs text-muted-foreground">{t("data.backups.empty")}</p>}
        >
          <div class="divide-y divide-border rounded-md border border-border">
            <For each={backups()}>
              {(backup) => (
                <div class="flex items-center justify-between gap-3 p-2">
                  <div class="min-w-0">
                    <div class="truncate font-mono text-xs">{backup.name}</div>
                    <div class="text-xs text-muted-foreground">
                      {new Date(backup.createdAt).toLocaleString()} · {formatBytes(backup.sizeBytes)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={confirming() === backup.path ? "destructive" : "outline"}
                    onClick={() => restore(backup.path)}
                    disabled={busy() !== ""}
                  >
                    {confirming() === backup.path ? t("data.restore.confirm") : t("data.restore")}
                  </Button>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Button size="sm" variant="outline" onClick={pickFile} disabled={busy() !== ""}>
          {t("data.restore.pickFile")}
        </Button>
      </div>
    </div>
  )
}
