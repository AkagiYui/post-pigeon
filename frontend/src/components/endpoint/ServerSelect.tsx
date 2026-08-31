import { createEffect, createSignal, on, onCleanup, Show } from "solid-js"

import type { ModuleServer } from "@/../bindings/PostPigeon/internal/models"
import { ModuleService } from "@/../bindings/PostPigeon/internal/services"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { baseUrlVersion } from "@/stores/app"
import { toastError } from "@/stores/toast"

export function ServerSelect(props: { moduleId?: string; value?: string; onChange: (value: string) => void }) {
  const [servers, setServers] = createSignal<ModuleServer[]>([])
  let token = 0
  onCleanup(() => { token++ })
  createEffect(on(() => [props.moduleId, baseUrlVersion()] as const, async ([moduleId]) => {
    const current = ++token
    setServers([])
    if (!moduleId) return
    try {
      const module = await ModuleService.GetModule(moduleId)
      if (current === token) setServers(module?.servers || [])
    } catch (error) { if (current === token) toastError(error) }
  }))
  return <Show when={props.moduleId}>
    <div class="space-y-1.5">
      <label class="text-sm font-medium">{t("server.title")}</label>
      <Select value={props.value === "default" || servers().some(server => server.id === props.value) ? props.value || "" : ""} onChange={props.onChange} options={[
        { value: "", label: t("inherit.parent") },
        { value: "default", label: t("server.default") },
        ...servers().map(server => ({ value: server.id, label: server.name })),
      ]} aria-label={t("server.title")} />
    </div>
  </Show>
}
