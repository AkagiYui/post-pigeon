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
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

/** 超时未设置时后端使用的默认值（毫秒），与 models.DefaultRequestTimeoutMs 保持一致 */
const DEFAULT_TIMEOUT_MS = 300000

/** UA 留空时后端发送的默认值，与 models.DefaultUserAgent 保持一致 */
const DEFAULT_USER_AGENT = "PostPigeon/1.0.0 (https://github.com/AkagiYui/PostPigeon)"

/** 全局 URL 自动编码档位：全局是最后一层，没有「跟随上级」可选 */
const globalUrlEncodingOptions = () => [
  { value: "rfc3986", label: t("urlEncoding.rfc3986") },
  { value: "whatwg", label: t("urlEncoding.whatwg") },
  { value: "off", label: t("urlEncoding.off") },
]

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

/** 可留空的整数输入行：留空表示用 placeholder 上的默认值 */
function OptionalNumberField(props: {
  label: string
  hint: string
  value: string
  unit: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div class="space-y-1.5">
      <label class="text-sm font-medium">{props.label}</label>
      <div class="flex items-center gap-2">
        <Input
          size="sm"
          type="number"
          min="0"
          step="1"
          placeholder={props.placeholder}
          value={props.value}
          // 只保留数字，避免 number 输入框允许的 e / +/- 等字符混进来
          onInput={(e) => props.onChange(e.currentTarget.value.replace(/[^\d]/g, ""))}
          class="w-32"
        />
        <span class="text-xs text-muted-foreground">{props.unit}</span>
      </div>
      <p class="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  )
}

/** 可留空的文本输入行：留空表示用 placeholder 上的默认值 */
function TextField(props: {
  label: string
  hint: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div class="space-y-1.5">
      <label class="text-sm font-medium">{props.label}</label>
      <Input
        size="sm"
        placeholder={props.placeholder}
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
      />
      <p class="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  )
}

/** 下拉选择行 */
function SelectField(props: {
  label: string
  hint: string
  value: string
  options: { value: string, label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div class="space-y-1.5">
      <label class="text-sm font-medium">{props.label}</label>
      <Select options={props.options} value={props.value} onChange={props.onChange} size="sm" class="w-48" />
      <p class="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  )
}

/** 开关行 */
function ToggleField(props: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div class="space-y-1.5">
      <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
        <Checkbox checked={props.checked} onChange={(e) => props.onChange(e.currentTarget.checked)} />
        <span class="font-medium">{props.label}</span>
      </label>
      <p class="pl-6 text-xs text-muted-foreground">{props.hint}</p>
    </div>
  )
}

export function RequestLimitsSettings() {
  const [timeoutMs, setTimeoutMs] = createSignal("")
  const [followRedirects, setFollowRedirects] = createSignal(true)
  const [sendNoCache, setSendNoCache] = createSignal(false)
  const [allowJsonComments, setAllowJsonComments] = createSignal(true)
  const [autoConvertWSProtocol, setAutoConvertWSProtocol] = createSignal(true)
  const [userAgent, setUserAgent] = createSignal("")
  const [urlEncoding, setUrlEncoding] = createSignal("rfc3986")
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
        // 未设置回显为空（placeholder 写着默认值），0 表示不限制超时
        setTimeoutMs(request.timeoutMs == null ? "" : String(request.timeoutMs))
        setFollowRedirects(request.followRedirects)
        setSendNoCache(request.sendNoCacheHeaders)
        setAllowJsonComments(request.allowJsonComments)
        setAutoConvertWSProtocol(request.autoConvertWsProtocol)
        setUserAgent(request.userAgent)
        setUrlEncoding(request.urlEncoding || "rfc3986")
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
        // 留空即「未设置」，不写这一项，由后端按默认值处理；显式填 0 表示不限制超时
        timeoutMs: timeoutMs().trim() === "" ? null : Math.max(0, Math.round(Number(timeoutMs()))),
        followRedirects: followRedirects(),
        sendNoCacheHeaders: sendNoCache(),
        allowJsonComments: allowJsonComments(),
        autoConvertWsProtocol: autoConvertWSProtocol(),
        // 留空即「未设置」，由后端发送内置默认 UA
        userAgent: userAgent().trim(),
        urlEncoding: urlEncoding(),
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
        <OptionalNumberField
          label={t("request.timeout")}
          hint={t("request.timeout.hint")}
          unit="ms"
          placeholder={String(DEFAULT_TIMEOUT_MS)}
          value={timeoutMs()}
          onChange={setTimeoutMs}
        />
        <ToggleField
          label={t("request.followRedirects")}
          hint={t("request.followRedirects.hint")}
          checked={followRedirects()}
          onChange={setFollowRedirects}
        />
        <ToggleField
          label={t("request.noCache")}
          hint={t("request.noCache.hint")}
          checked={sendNoCache()}
          onChange={setSendNoCache}
        />
        <ToggleField
          label={t("request.jsonComments")}
          hint={t("request.jsonComments.hint")}
          checked={allowJsonComments()}
          onChange={setAllowJsonComments}
        />
        <ToggleField
          label={t("wsProtocol.title")}
          hint={t("wsProtocol.global.hint")}
          checked={autoConvertWSProtocol()}
          onChange={setAutoConvertWSProtocol}
        />

        <SelectField
          label={t("urlEncoding.title")}
          hint={t("urlEncoding.hint")}
          value={urlEncoding()}
          options={globalUrlEncodingOptions()}
          onChange={setUrlEncoding}
        />

        <TextField
          label={t("request.userAgent")}
          hint={t("request.userAgent.hint")}
          placeholder={DEFAULT_USER_AGENT}
          value={userAgent()}
          onChange={setUserAgent}
        />

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

        <ToggleField
          label={t("history.maskSensitive")}
          hint={t("history.maskSensitive.hint")}
          checked={maskSensitive()}
          onChange={setMaskSensitive}
        />

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
