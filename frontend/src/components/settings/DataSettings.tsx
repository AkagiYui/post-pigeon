// 数据维护面板：数据库有多大、能回收多少、一键压缩。
//
// 无服务端应用没有运维入口：历史清理、删项目都只是 DELETE，SQLite 的页会进
// freelist 但文件不会缩，用户看到的就是「我明明清空了历史，库还是几百 MB」。
// 把体积和「压缩」摆到台面上，这件事才有解释、有出口。
import { createSignal, onMount } from "solid-js"

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
        <span class="font-mono text-sm text-muted-foreground">{props.value}</span>
      </div>
      {props.hint && <p class="text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  )
}

export function DataSettings() {
  const [info, setInfo] = createSignal<DatabaseInfo | null>(null)
  const [compacting, setCompacting] = createSignal(false)

  const load = async () => {
    try {
      setInfo(await DataService.GetDatabaseInfo())
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  onMount(load)

  const compact = async () => {
    setCompacting(true)
    const before = info()?.sizeBytes ?? 0
    try {
      const next = await DataService.CompactDatabase()
      setInfo(next)
      const freed = Math.max(0, before - next.sizeBytes)
      toastSuccess(t("data.compacted", { size: formatBytes(freed) }))
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setCompacting(false)
    }
  }

  return (
    <div class="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <p class="text-xs text-muted-foreground">{t("data.hint")}</p>

      <div class="space-y-3 rounded-md border border-border p-3">
        <InfoRow
          label={t("data.dbSize")}
          value={formatBytes(info()?.sizeBytes ?? 0)}
          hint={info()?.path}
        />
        <InfoRow
          label={t("data.reclaimable")}
          value={formatBytes(info()?.reclaimableBytes ?? 0)}
          hint={t("data.reclaimable.hint")}
        />
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={compact} disabled={compacting()}>
            {compacting() ? t("data.compacting") : t("data.compact")}
          </Button>
        </div>
      </div>
    </div>
  )
}
