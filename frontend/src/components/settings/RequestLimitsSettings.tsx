// 请求限额与历史保留策略设置（全局）。
//
// 这两组设置决定了应用的资源边界：没有响应体上限，一个下载类接口就能把内存打满；
// 没有历史保留策略，历史表会带着完整响应快照无限增长。
import { createSignal, onMount } from "solid-js"

import { HistorySettings, RequestSettings } from "@/../bindings/PostPigeon/internal/models"
import { RequestHistoryService, SettingsService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

/** 字节 ↔ MiB 换算，界面上用 MiB 更易读 */
const MIB = 1024 * 1024
const toMiB = (bytes: number) => (bytes > 0 ? Math.round((bytes / MIB) * 100) / 100 : 0)
const fromMiB = (mib: number) => (mib > 0 ? Math.round(mib * MIB) : 0)

/** 数字输入行：0 一律表示「不限制 / 永久」 */
function NumberField(props: {
  label: string
  hint: string
  value: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div class="space-y-1.5">
      <label class="text-sm font-medium">{props.label}</label>
      <div class="flex items-center gap-2">
        <Input
          size="sm"
          type="number"
          min="0"
          step="any"
          value={String(props.value)}
          onInput={(e) => props.onChange(Math.max(0, Number(e.currentTarget.value) || 0))}
          class="w-32"
        />
        <span class="text-xs text-muted-foreground">{props.unit}</span>
      </div>
      <p class="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  )
}

export function RequestLimitsSettings() {
  const [maxResponseMiB, setMaxResponseMiB] = createSignal(32)
  const [maxStoredMiB, setMaxStoredMiB] = createSignal(1)
  const [maxWSMiB, setMaxWSMiB] = createSignal(32)
  const [retentionDays, setRetentionDays] = createSignal(30)
  const [maxRows, setMaxRows] = createSignal(2000)
  const [maskSensitive, setMaskSensitive] = createSignal(true)
  const [saving, setSaving] = createSignal(false)
  const [pruning, setPruning] = createSignal(false)
  const [clearing, setClearing] = createSignal(false)

  const load = async () => {
    try {
      const [request, history] = await Promise.all([
        SettingsService.GetRequestSettings(),
        SettingsService.GetHistorySettings(),
      ])
      if (request) {
        setMaxResponseMiB(toMiB(request.maxResponseBytes))
        setMaxStoredMiB(toMiB(request.maxStoredBodyBytes))
        setMaxWSMiB(toMiB(request.maxWebSocketMessageBytes))
      }
      if (history) {
        setRetentionDays(history.retentionDays)
        setMaxRows(history.maxRowsPerModule)
        setMaskSensitive(history.maskSensitive)
      }
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  onMount(load)

  const save = async () => {
    setSaving(true)
    try {
      await SettingsService.SaveRequestSettings(new RequestSettings({
        maxResponseBytes: fromMiB(maxResponseMiB()),
        maxStoredBodyBytes: fromMiB(maxStoredMiB()),
        maxWebSocketMessageBytes: fromMiB(maxWSMiB()),
      }))
      await SettingsService.SaveHistorySettings(new HistorySettings({
        retentionDays: Math.max(0, Math.round(retentionDays())),
        maxRowsPerModule: Math.max(0, Math.round(maxRows())),
        maskSensitive: maskSensitive(),
      }))
      toastSuccess(t("common.saved"))
      await load()
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  const pruneNow = async () => {
    setPruning(true)
    try {
      await RequestHistoryService.PruneNow()
      toastSuccess(t("history.pruned"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    } finally {
      setPruning(false)
    }
  }

  const clearAll = async () => {
    setClearing(true)
    try {
      await RequestHistoryService.ClearAllHistory()
      toastSuccess(t("history.cleared"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    } finally {
      setClearing(false)
    }
  }

  return (
    <div class="flex h-full flex-col gap-4">
      <div>
        <h2 class="text-base font-medium">{t("settings.request")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("request.hint")}</p>
      </div>

      <div class="min-h-0 flex-1 space-y-5 overflow-auto pr-1">
        <NumberField
          label={t("request.maxResponse")}
          hint={t("request.maxResponse.hint")}
          unit="MiB"
          value={maxResponseMiB()}
          onChange={setMaxResponseMiB}
        />
        <NumberField
          label={t("request.maxStored")}
          hint={t("request.maxStored.hint")}
          unit="MiB"
          value={maxStoredMiB()}
          onChange={setMaxStoredMiB}
        />
        <NumberField
          label={t("request.maxWSFrame")}
          hint={t("request.maxWSFrame.hint")}
          unit="MiB"
          value={maxWSMiB()}
          onChange={setMaxWSMiB}
        />

        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-medium">{t("history.retention")}</h3>
          <p class="mt-1 text-xs text-muted-foreground">{t("history.retention.hint")}</p>
        </div>

        <NumberField
          label={t("history.retentionDays")}
          hint={t("history.retentionDays.hint")}
          unit={t("history.unit.days")}
          value={retentionDays()}
          onChange={setRetentionDays}
        />
        <NumberField
          label={t("history.maxRows")}
          hint={t("history.maxRows.hint")}
          unit={t("history.unit.rows")}
          value={maxRows()}
          onChange={setMaxRows}
        />

        <div class="space-y-1.5">
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
            <Checkbox checked={maskSensitive()} onChange={(e) => setMaskSensitive(e.currentTarget.checked)} />
            <span class="font-medium">{t("history.maskSensitive")}</span>
          </label>
          <p class="pl-6 text-xs text-muted-foreground">{t("history.maskSensitive.hint")}</p>
        </div>

        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={pruneNow} disabled={pruning()}>
            {pruning() ? t("common.deleting") : t("history.pruneNow")}
          </Button>
          <Button size="sm" variant="destructive" onClick={clearAll} disabled={clearing()}>
            {clearing() ? t("common.deleting") : t("history.clearAll")}
          </Button>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 border-t border-border pt-3">
        <Button size="sm" onClick={save} disabled={saving()}>
          {saving() ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  )
}
