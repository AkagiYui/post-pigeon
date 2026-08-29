// 项目级「URL 自动编码」设置。
//
// 层级与代理 / TLS 一致：接口（跟随项目 / 具体档位）→ 项目（跟随全局 / 具体档位）→ 全局。
// 全局档位在「设置 → 请求与历史」里，接口档位在接口的「设置」页里。
import { createEffect, createSignal, on } from "solid-js"

import { ProjectService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

export interface URLEncodingSettingsProps {
  /** 项目 ID */
  projectId?: string | null
}

/** 项目级档位：比全局多一个「跟随全局设置」 */
const options = () => [
  { value: "inherit", label: t("urlEncoding.inherit.global") },
  { value: "rfc3986", label: t("urlEncoding.rfc3986") },
  { value: "whatwg", label: t("urlEncoding.whatwg") },
  { value: "off", label: t("urlEncoding.off") },
]

export function URLEncodingSettings(props: URLEncodingSettingsProps) {
  const [mode, setMode] = createSignal("inherit")
  const [saving, setSaving] = createSignal(false)

  const load = async () => {
    if (!props.projectId) return
    try {
      const saved = await ProjectService.GetProjectURLEncoding(props.projectId)
      setMode(saved || "inherit")
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  createEffect(on(() => props.projectId, () => { load() }))

  const save = async () => {
    if (!props.projectId) return
    setSaving(true)
    try {
      await ProjectService.SaveProjectURLEncoding(props.projectId, mode())
      toastSuccess(t("common.saved"))
      await load()
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="flex h-full flex-col gap-4">
      <div>
        <h2 class="text-base font-medium">{t("urlEncoding.title")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("urlEncoding.project.hint")}</p>
      </div>

      <div class="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
        <Select options={options()} value={mode()} onChange={setMode} size="sm" class="w-56" />
        <p class="text-xs text-muted-foreground">{t("urlEncoding.hint")}</p>
      </div>

      <div class="flex shrink-0 items-center gap-2 border-t border-border pt-3">
        <Button size="sm" onClick={save} disabled={saving()}>
          {saving() ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  )
}
