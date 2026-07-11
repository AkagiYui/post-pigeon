// 模块 / 文件夹级设置对话框：默认认证、自动参数（仅模块）、前置/后置操作。
// 认证与操作对该级别下所有接口（递归）继承生效。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal } from "solid-js"

import { ModuleParam, Operation } from "@/../bindings/PostPigeon/internal/models"
import { FolderSettings, ModuleSettings, ScopeSettingsService } from "@/../bindings/PostPigeon/internal/services"
import { AuthEditor } from "@/components/endpoint/AuthEditor"
import { type AuthState, emptyAuth, emptyOperation, type OperationRow } from "@/components/endpoint/EndpointDetail"
import { OperationsEditor } from "@/components/endpoint/OperationsEditor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"
import type { AuthType, OperationStage, OperationType } from "@/lib/types"

// ---- 认证 / 操作 模型 <-> 编辑态 转换 ----

function authToState(type: string, data: string): AuthState {
  const s = emptyAuth()
  s.type = (type || "none") as AuthType
  let d: any = {}
  try { d = data ? JSON.parse(data) : {} } catch { d = {} }
  s.username = d.username || ""; s.password = d.password || ""; s.token = d.token || ""
  s.apiKeyKey = d.key || ""; s.apiKeyValue = d.value || ""; s.apiKeyIn = d.in || "header"
  return s
}

function stateToAuth(a: AuthState): { authType: string; authData: string } {
  let data = "{}"
  if (a.type === "basic") data = JSON.stringify({ username: a.username, password: a.password })
  else if (a.type === "bearer") data = JSON.stringify({ token: a.token })
  else if (a.type === "apikey") data = JSON.stringify({ key: a.apiKeyKey, value: a.apiKeyValue, in: a.apiKeyIn || "header" })
  return { authType: a.type, authData: data }
}

function opToRow(o: Operation): OperationRow {
  let d: any = {}
  try { d = o.data ? JSON.parse(o.data) : {} } catch { d = {} }
  return {
    id: crypto.randomUUID(), stage: (o.stage as OperationStage) || "pre", type: (o.type as OperationType) || "script",
    name: o.name || "", enabled: o.enabled, script: d.script || "", libraryId: d.libraryId || "",
    assertSource: d.source || "responseJson", assertExpression: d.expression || "", assertComparison: d.comparison || "eq", assertTarget: d.target || "",
    varName: d.variable || "", varScope: d.scope || "environment", varSource: d.source || "responseJson", varExpression: d.expression || "",
    waitMs: d.milliseconds || 1000,
  }
}

function rowToOp(r: OperationRow, i: number): Operation {
  let data = "{}"
  switch (r.type) {
    case "script": data = JSON.stringify({ script: r.script }); break
    case "libraryScript": data = JSON.stringify({ libraryId: r.libraryId, script: r.script }); break
    case "assert": data = JSON.stringify({ source: r.assertSource, expression: r.assertExpression, comparison: r.assertComparison, target: r.assertTarget }); break
    case "extractVar": data = JSON.stringify({ variable: r.varName, scope: r.varScope, source: r.varSource, expression: r.varExpression }); break
    case "wait": data = JSON.stringify({ milliseconds: r.waitMs }); break
  }
  return new Operation({ stage: r.stage, type: r.type, name: r.name, enabled: r.enabled, sortOrder: i, data })
}

interface ParamRow { id: string; type: string; name: string; value: string; enabled: boolean }

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
        setAuth(authToState(s?.authType || "none", s?.authData || ""))
        setOperations((s?.operations || []).map(opToRow))
        setParams((s?.params || []).map(p => ({ id: crypto.randomUUID(), type: p.type || "query", name: p.name, value: p.value, enabled: p.enabled })))
      } else {
        const s = await ScopeSettingsService.GetFolderSettings(props.scopeId)
        setAuth(authToState(s?.authType || "inherit", s?.authData || ""))
        setOperations((s?.operations || []).map(opToRow))
      }
    } catch (e) { console.error("加载作用域设置失败", e) }
  }
  // 每次渲染时确保加载（open 变化触发）
  createEffectOnOpen(() => props.open, ensureLoaded)

  const save = async () => {
    setSaving(true)
    try {
      const a = stateToAuth(auth())
      const ops = operations().map(rowToOp)
      if (props.scopeType === "module") {
        const mp = params().filter(p => p.name.trim()).map(p => new ModuleParam({ type: p.type, name: p.name, value: p.value, enabled: p.enabled }))
        await ScopeSettingsService.SaveModuleSettings(props.scopeId, new ModuleSettings({ authType: a.authType, authData: a.authData, params: mp, operations: ops }))
      } else {
        await ScopeSettingsService.SaveFolderSettings(props.scopeId, new FolderSettings({ authType: a.authType, authData: a.authData, operations: ops }))
      }
      setLoadedFor("")
      props.onClose()
    } catch (e) { console.error("保存作用域设置失败", e) } finally { setSaving(false) }
  }

  const tabs = () => {
    const base = [{ key: "auth", label: t("endpoint.auth") }, { key: "operations", label: t("endpoint.operations") }]
    if (props.scopeType === "module") base.splice(1, 0, { key: "params", label: t("scope.autoParams") })
    return base
  }

  // 参数表操作
  const addParam = () => setParams(prev => [...prev, { id: crypto.randomUUID(), type: "query", name: "", value: "", enabled: true }])
  const removeParam = (id: string) => setParams(prev => prev.filter(p => p.id !== id))
  const updateParam = (id: string, field: keyof ParamRow, value: string | boolean) => setParams(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("scope.settingsTitle", { name: props.scopeName })} closeOnEsc closeOnOverlayClick width="640px">
      <div class="flex flex-col h-[70vh]">
        <div class="flex-1 min-h-0">
          <Tabs tabs={tabs()} value={tab()} onChange={setTab}>
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
