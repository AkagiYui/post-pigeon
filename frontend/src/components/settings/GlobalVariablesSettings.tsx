// 全局变量设置：项目级、跨环境的变量
import { Plus, Trash2 } from "lucide-solid"
import { createSignal, onMount } from "solid-js"

import { GlobalVariable } from "@/../bindings/post-pigeon/internal/models"
import { GlobalVariableService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"

interface VarRow {
  id: string
  key: string
  value: string
  description: string
  enabled: boolean
}

export interface GlobalVariablesSettingsProps {
  projectId: string | null
}

export function GlobalVariablesSettings(props: GlobalVariablesSettingsProps) {
  const [rows, setRows] = createSignal<VarRow[]>([])
  const [saving, setSaving] = createSignal(false)
  const [saved, setSaved] = createSignal(false)

  onMount(async () => {
    if (!props.projectId) return
    try {
      const list = await GlobalVariableService.ListGlobalVariables(props.projectId)
      setRows((list || []).map(v => ({ id: crypto.randomUUID(), key: v.key, value: v.value, description: v.description, enabled: v.enabled })))
    } catch (e) { console.error("加载全局变量失败", e) }
  })

  const addRow = () => setRows(prev => [...prev, { id: crypto.randomUUID(), key: "", value: "", description: "", enabled: true }])
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))
  const update = (id: string, field: keyof VarRow, value: string | boolean) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const save = async () => {
    if (!props.projectId) return
    setSaving(true)
    setSaved(false)
    try {
      const models = rows().filter(r => r.key.trim()).map(r => new GlobalVariable({ key: r.key, value: r.value, description: r.description, enabled: r.enabled }))
      await GlobalVariableService.SaveGlobalVariables(props.projectId, models)
      setSaved(true)
    } catch (e) { console.error("保存全局变量失败", e) } finally { setSaving(false) }
  }

  return (
    <div class="flex flex-col gap-4 h-full">
      <div>
        <h2 class="text-base font-medium">{t("globalVar.title")}</h2>
        <p class="text-sm text-muted-foreground mt-1">{t("globalVar.hint")}</p>
      </div>

      <div class="flex-1 min-h-0 overflow-auto">
        <Table
          columns={[
            { header: "", width: "32px", render: (row) => (
              <input type="checkbox" checked={row.enabled} onChange={(e) => update(row.id, "enabled", e.currentTarget.checked)} class="rounded border-border" />
            ) },
            { header: t("common.name"), render: (row) => (
              <Input size="sm" value={row.key} onInput={(e) => update(row.id, "key", e.currentTarget.value)} />
            ) },
            { header: t("common.value"), render: (row) => (
              <Input size="sm" value={row.value} onInput={(e) => update(row.id, "value", e.currentTarget.value)} />
            ) },
            { header: t("endpoint.param.description"), render: (row) => (
              <Input size="sm" value={row.description} onInput={(e) => update(row.id, "description", e.currentTarget.value)} />
            ) },
            { header: "", width: "32px", render: (row) => (
              <Button variant="ghost" size="icon-sm" onClick={() => removeRow(row.id)}><Trash2 class="h-3 w-3" /></Button>
            ) },
          ]}
          data={rows()}
          compact
          emptyText={t("globalVar.empty")}
        />
        <Button variant="outline" size="sm" class="mt-2" onClick={addRow}><Plus class="h-3 w-3" />{t("common.add")}</Button>
      </div>

      <div class="flex items-center justify-end gap-3 shrink-0">
        {saved() && <span class="text-sm text-green-600 dark:text-green-400">{t("common.saved")}</span>}
        <Button onClick={save} disabled={saving()}>{saving() ? t("common.saving") : t("common.save")}</Button>
      </div>
    </div>
  )
}
