// 端点设置编辑器
import { createSignal, Show } from "solid-js"

import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"

export interface EndpointSettingsEditorProps {
  timeout: number
  followRedirects: boolean
  onChange?: (data: { timeout?: number; followRedirects?: boolean }) => void
}

export function EndpointSettingsEditor(props: EndpointSettingsEditorProps) {
  return (
    <div class="p-3 space-y-4">
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
