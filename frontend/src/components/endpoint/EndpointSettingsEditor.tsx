// 端点设置编辑器：超时、重定向，以及接口元数据（状态 / 标签 / 描述）
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"

export interface EndpointSettingsEditorProps {
  timeout: number
  followRedirects: boolean
  /** 接口状态：developing / testing / released / deprecated */
  status: string
  /** 标签（JSON 字符串数组） */
  tags: string
  /** 接口描述 */
  description: string
  onChange?: (data: { timeout?: number; followRedirects?: boolean; status?: string; tags?: string; description?: string }) => void
}

/** 接口状态选项 */
const statusOptions = () => [
  { value: "", label: t("endpoint.status.none") },
  { value: "designing", label: t("endpoint.status.designing") },
  { value: "developing", label: t("endpoint.status.developing") },
  { value: "testing", label: t("endpoint.status.testing") },
  { value: "released", label: t("endpoint.status.released") },
  { value: "deprecated", label: t("endpoint.status.deprecated") },
]

/** 标签：JSON 数组字符串 <-> 逗号分隔文本 互转 */
function tagsToText(json: string): string {
  try {
    const arr = JSON.parse(json || "[]")
    return Array.isArray(arr) ? arr.join(", ") : ""
  } catch {
    return ""
  }
}
function textToTags(text: string): string {
  const arr = text.split(",").map(s => s.trim()).filter(Boolean)
  return arr.length ? JSON.stringify(arr) : ""
}

export function EndpointSettingsEditor(props: EndpointSettingsEditorProps) {
  return (
    <div class="p-3 space-y-4 overflow-auto h-full">
      {/* 接口元数据 */}
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.statusLabel")}</label>
        <Select
          options={statusOptions()}
          value={props.status || ""}
          onChange={(v) => props.onChange?.({ status: v })}
          size="sm"
          class="w-40"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.tags")}</label>
        <Input
          size="sm"
          value={tagsToText(props.tags)}
          onInput={(e) => props.onChange?.({ tags: textToTags(e.currentTarget.value) })}
          placeholder={t("endpoint.tagsPlaceholder")}
          class="flex-1"
        />
      </div>
      <div class="flex items-start gap-3">
        <label class="text-sm font-medium w-28 shrink-0 pt-1.5">{t("endpoint.description")}</label>
        <textarea
          value={props.description || ""}
          onInput={(e) => props.onChange?.({ description: e.currentTarget.value })}
          placeholder={t("endpoint.descriptionPlaceholder")}
          rows={3}
          class="flex-1 rounded-md border border-border bg-input px-2 py-1.5 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div class="h-px bg-border" />

      {/* 请求设置 */}
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.timeout")} (ms)</label>
        <Input
          type="number"
          value={props.timeout.toString()}
          onInput={(e) => props.onChange?.({ timeout: parseInt(e.currentTarget.value) || 30000 })}
          class="w-32"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.followRedirects")}</label>
        <input
          type="checkbox"
          checked={props.followRedirects}
          onChange={(e) => props.onChange?.({ followRedirects: e.currentTarget.checked })}
          class="rounded border-border"
        />
      </div>
    </div>
  )
}
