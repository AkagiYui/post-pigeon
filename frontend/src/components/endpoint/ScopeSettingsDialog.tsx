// 模块 / 文件夹级设置对话框：默认认证、自动参数与模块变量（仅模块）、前置/后置操作。
// 认证与操作对该级别下所有接口（递归）继承生效。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal } from "solid-js"

import { ModuleParam, ModuleVariable } from "@/../bindings/PostPigeon/internal/models"
import { FolderSettings, ModuleSettings, ScopeSettingsService } from "@/../bindings/PostPigeon/internal/services"
import { AuthEditor } from "@/components/endpoint/AuthEditor"
import { authDataToState, authStateToData, fromOperationModels, toOperationModels } from "@/components/endpoint/endpoint-data"
import { type AuthState, emptyAuth, type OperationRow } from "@/components/endpoint/EndpointDetail"
import { OperationsEditor } from "@/components/endpoint/OperationsEditor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { toastError } from "@/stores/toast"

// 认证与操作的转换直接复用 endpoint-data 里的实现：
// 模块/文件夹级与接口级本就是同一套语义，各写一份的结果是新增认证类型时只改了一边
// （digest / oauth2 起初就只在接口级可用）。

interface ParamRow { id: string; type: string; name: string; value: string; enabled: boolean }
interface VarRow { id: string; key: string; value: string; description: string; enabled: boolean; isSecret: boolean }

export interface ScopeSettingsDialogProps {
  open: boolean
  onClose: () => void
  scopeType: "module" | "folder"
  scopeId: string
  scopeName: string
  projectId: string
}

export function ScopeSettingsDialog(props: ScopeSettingsDialogProps) {
  const [tab, setTab] = createSignal("auth")
  const [auth, setAuth] = createSignal<AuthState>(emptyAuth())
  const [operations, setOperations] = createSignal<OperationRow[]>([])
  const [params, setParams] = createSignal<ParamRow[]>([])
  const [vars, setVars] = createSignal<VarRow[]>([])
  const [saving, setSaving] = createSignal(false)
  const [loadedFor, setLoadedFor] = createSignal("")

  // 打开或切换目标时加载设置
  const ensureLoaded = async () => {
    const key = `${props.scopeType}:${props.scopeId}`
    if (!props.open || !props.scopeId || loadedFor() === key) return
    setLoadedFor(key)
    try {
      if (props.scopeType === "module") {
        const s = await ScopeSettingsService.GetModuleSettings(props.scopeId)
        setAuth(authDataToState(s?.authType || "none", s?.authData || ""))
        setOperations(fromOperationModels(s?.operations))
        setParams((s?.params || []).map(p => ({ id: crypto.randomUUID(), type: p.type || "query", name: p.name, value: p.value, enabled: p.enabled })))
        setVars((s?.variables || []).map(v => ({ id: crypto.randomUUID(), key: v.key, value: v.value, description: v.description, enabled: v.enabled, isSecret: v.isSecret })))
      } else {
        const s = await ScopeSettingsService.GetFolderSettings(props.scopeId)
        setAuth(authDataToState(s?.authType || "inherit", s?.authData || ""))
        setOperations(fromOperationModels(s?.operations))
      }
    } catch (e) { toastError(e, "error.op.loadFailed") }
  }
  // 每次渲染时确保加载（open 变化触发）
  createEffectOnOpen(() => props.open, ensureLoaded)

  const save = async () => {
    setSaving(true)
    try {
      const authType = auth().type
      const authData = authStateToData(auth())
      const ops = toOperationModels(operations())
      if (props.scopeType === "module") {
        const mp = params().filter(p => p.name.trim()).map(p => new ModuleParam({ type: p.type, name: p.name, value: p.value, enabled: p.enabled }))
        const mv = vars().filter(v => v.key.trim()).map(v => new ModuleVariable({ key: v.key.trim(), value: v.value, description: v.description, enabled: v.enabled, isSecret: v.isSecret }))
        await ScopeSettingsService.SaveModuleSettings(props.scopeId, new ModuleSettings({ authType, authData, params: mp, variables: mv, operations: ops }))
      } else {
        await ScopeSettingsService.SaveFolderSettings(props.scopeId, new FolderSettings({ authType, authData, operations: ops }))
      }
      setLoadedFor("")
      props.onClose()
    } catch (e) { toastError(e, "error.op.saveFailed") } finally { setSaving(false) }
  }

  const tabs = () => {
    const base = [{ key: "auth", label: t("endpoint.auth") }, { key: "operations", label: t("endpoint.operations") }]
    if (props.scopeType === "module") base.splice(1, 0, { key: "params", label: t("scope.autoParams") }, { key: "variables", label: t("scope.variables") })
    return base
  }

  // 参数表操作
  const addParam = () => setParams(prev => [...prev, { id: crypto.randomUUID(), type: "query", name: "", value: "", enabled: true }])
  const removeParam = (id: string) => setParams(prev => prev.filter(p => p.id !== id))
  const updateParam = (id: string, field: keyof ParamRow, value: string | boolean) => setParams(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))

  // 模块变量表操作
  const addVar = () => setVars(prev => [...prev, { id: crypto.randomUUID(), key: "", value: "", description: "", enabled: true, isSecret: false }])
  const removeVar = (id: string) => setVars(prev => prev.filter(v => v.id !== id))
  const updateVar = (id: string, field: keyof VarRow, value: string | boolean) => setVars(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("scope.settingsTitle", { name: props.scopeName })} closeOnEsc closeOnOverlayClick width="640px">
      <div class="flex flex-col h-[70vh]">
        <div class="flex-1 min-h-0">
          <Tabs variant="line" tabs={tabs()} value={tab()} onChange={setTab}>
            {(key) => {
              if (key === "auth") return <AuthEditor value={auth()} onChange={setAuth} />
              if (key === "operations") return <OperationsEditor operations={operations()} onChange={setOperations} projectId={props.projectId} />
              if (key === "params") return (
                <div class="p-3 h-full overflow-auto">
                  <p class="text-sm text-muted-foreground mb-2">{t("scope.autoParamsHint")}</p>
                  <Table
                    columns={[
                      { header: "", width: "32px", render: (row) => <Checkbox checked={row.enabled} onChange={(e) => updateParam(row.id, "enabled", e.currentTarget.checked)} /> },
                      { header: t("endpoint.param.location"), width: "96px", render: (row) => (
                        <Select options={[{ value: "query", label: "Query" }, { value: "header", label: "Header" }, { value: "cookie", label: "Cookie" }]} value={row.type} onChange={(v) => updateParam(row.id, "type", v)} size="sm" />
                      ) },
                      { header: t("common.name"), render: (row) => <Input size="sm" value={row.name} onInput={(e) => updateParam(row.id, "name", e.currentTarget.value)} /> },
                      { header: t("common.value"), render: (row) => <Input size="sm" value={row.value} onInput={(e) => updateParam(row.id, "value", e.currentTarget.value)} /> },
                      { header: "", width: "32px", render: (row) => <Button variant="ghost" size="icon-sm" onClick={() => removeParam(row.id)}><Icon icon="lucide:trash-2" class="h-3 w-3" /></Button> },
                    ]}
                    data={params()}
                    compact
                  />
                  <Button variant="outline" size="sm" class="mt-2" onClick={addParam}><Icon icon="lucide:plus" class="h-3 w-3" />{t("common.add")}</Button>
                </div>
              )
              if (key === "variables") return (
                <div class="p-3 h-full overflow-auto">
                  <p class="text-sm text-muted-foreground mb-2">{t("scope.variablesHint")}</p>
                  <Table
                    columns={[
                      { header: "", width: "32px", render: (row) => <Checkbox checked={row.enabled} onChange={(e) => updateVar(row.id, "enabled", e.currentTarget.checked)} /> },
                      { header: t("common.name"), render: (row) => <Input size="sm" value={row.key} onInput={(e) => updateVar(row.id, "key", e.currentTarget.value)} /> },
                      { header: t("common.value"), render: (row) => (
                        <Input size="sm" type={row.isSecret ? "password" : "text"} value={row.value} onInput={(e) => updateVar(row.id, "value", e.currentTarget.value)} />
                      ) },
                      { header: t("endpoint.param.description"), render: (row) => <Input size="sm" value={row.description} onInput={(e) => updateVar(row.id, "description", e.currentTarget.value)} /> },
                      { header: "", width: "32px", render: (row) => (
                        <Tooltip content={row.isSecret ? t("scope.variable.unsetSecret") : t("scope.variable.setSecret")}>
                          <Button variant="ghost" size="icon-sm" class={row.isSecret ? "text-amber-500" : "text-muted-foreground"} onClick={() => updateVar(row.id, "isSecret", !row.isSecret)}>
                            <Icon icon="lucide:key" class="h-3 w-3" />
                          </Button>
                        </Tooltip>
                      ) },
                      { header: "", width: "32px", render: (row) => <Button variant="ghost" size="icon-sm" onClick={() => removeVar(row.id)}><Icon icon="lucide:trash-2" class="h-3 w-3" /></Button> },
                    ]}
                    data={vars()}
                    compact
                    emptyText={t("scope.variables.empty")}
                  />
                  <Button variant="outline" size="sm" class="mt-2" onClick={addVar}><Icon icon="lucide:plus" class="h-3 w-3" />{t("common.add")}</Button>
                </div>
              )
              return null
            }}
          </Tabs>
        </div>
        <div class="flex justify-end gap-2 p-3 border-t border-border shrink-0">
          <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={saving()}>{saving() ? t("common.saving") : t("common.save")}</Button>
        </div>
      </div>
    </Dialog>
  )
}

// 在 open 变为 true 时执行加载（内部按 scopeId 去重，避免重复加载）
function createEffectOnOpen(openGetter: () => boolean, fn: () => void) {
  createEffect(() => { if (openGetter()) fn() })
}
