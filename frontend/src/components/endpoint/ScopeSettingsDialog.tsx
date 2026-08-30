// 模块 / 文件夹级设置对话框：默认认证、自动参数与模块变量（仅模块）、前置/后置操作。
// 认证与操作对该级别下所有接口（递归）继承生效。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, Show } from "solid-js"

import { ModuleParam, ModuleVariable, OperationOverride, SelectableProxy } from "@/../bindings/PostPigeon/internal/models"
import { FolderSettings, ModuleSettings, ProxyService, ScopeSettingsService } from "@/../bindings/PostPigeon/internal/services"
import { AuthEditor } from "@/components/endpoint/AuthEditor"
import { authDataToState, authStateToData, fromInheritedOperationModels, fromOperationModels, hasEffectiveAuth, toOperationModels } from "@/components/endpoint/endpoint-data"
import { type AuthState, emptyAuth, type InheritedOperationRow, type OperationOverrideRow, type OperationRow, tabLabelWithCount } from "@/components/endpoint/EndpointDetail"
import { proxyJSONFromKey, proxyKeyFromJSON, tlsJSONFromMode, tlsModeFromJSON } from "@/components/endpoint/EndpointSettingsEditor"
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

function ScopeSelect(props: { label: string, value: string, options: { value: string, label: string }[], onChange: (value: string) => void }) {
  return (
    <div class="grid grid-cols-[9rem_1fr] items-center gap-3">
      <label class="text-sm font-medium">{props.label}</label>
      <Select options={props.options} value={props.value} onChange={props.onChange} size="sm" class="w-full" />
    </div>
  )
}

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
  const [hasInheritedAuth, setHasInheritedAuth] = createSignal(false)
  const [wsProtocolConversion, setWSProtocolConversion] = createSignal("inherit")
  const [proxyConfig, setProxyConfig] = createSignal("")
  const [tlsConfig, setTLSConfig] = createSignal("")
  const [urlEncoding, setURLEncoding] = createSignal("inherit")
  const [timeoutMode, setTimeoutMode] = createSignal("inherit")
  const [timeout, setTimeout] = createSignal(30000)
  const [followRedirects, setFollowRedirects] = createSignal<boolean | null>(null)
  const [sendNoCacheHeaders, setSendNoCacheHeaders] = createSignal<boolean | null>(null)
  const [selectableProxies, setSelectableProxies] = createSignal<SelectableProxy[]>([])
  const [operations, setOperations] = createSignal<OperationRow[]>([])
  const [inheritedOperations, setInheritedOperations] = createSignal<InheritedOperationRow[]>([])
  const [operationOverrides, setOperationOverrides] = createSignal<OperationOverrideRow[]>([])
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
      setSelectableProxies((await ProxyService.ListSelectableProxies(props.projectId)) || [])
      if (props.scopeType === "module") {
        const s = await ScopeSettingsService.GetModuleSettings(props.scopeId)
        setAuth(authDataToState(s?.authType || "none", s?.authData || ""))
        setHasInheritedAuth(false)
        setWSProtocolConversion(s?.wsProtocolConversion || "inherit")
        setProxyConfig(s?.proxyConfig || "")
        setTLSConfig(s?.tlsConfig || "")
        setURLEncoding(s?.urlEncoding || "inherit")
        setTimeoutMode(s?.timeoutMode || "inherit")
        setTimeout(s?.timeout || 0)
        setFollowRedirects(s?.followRedirects ?? null)
        setSendNoCacheHeaders(s?.sendNoCacheHeaders ?? null)
        setOperations(fromOperationModels(s?.operations))
        setInheritedOperations([])
        setOperationOverrides([])
        setParams((s?.params || []).map(p => ({ id: crypto.randomUUID(), type: p.type || "query", name: p.name, value: p.value, enabled: p.enabled })))
        setVars((s?.variables || []).map(v => ({ id: crypto.randomUUID(), key: v.key, value: v.value, description: v.description, enabled: v.enabled, isSecret: v.isSecret })))
      } else {
        const s = await ScopeSettingsService.GetFolderSettings(props.scopeId)
        setAuth(authDataToState(s?.authType || "inherit", s?.authData || ""))
        setHasInheritedAuth(s?.hasInheritedAuth ?? false)
        setWSProtocolConversion(s?.wsProtocolConversion || "inherit")
        setProxyConfig(s?.proxyConfig || "")
        setTLSConfig(s?.tlsConfig || "")
        setURLEncoding(s?.urlEncoding || "inherit")
        setTimeoutMode(s?.timeoutMode || "inherit")
        setTimeout(s?.timeout || 0)
        setFollowRedirects(s?.followRedirects ?? null)
        setSendNoCacheHeaders(s?.sendNoCacheHeaders ?? null)
        setOperations(fromOperationModels(s?.operations))
        setInheritedOperations(fromInheritedOperationModels(s?.inheritedOperations))
        setOperationOverrides((s?.operationOverrides || []).map(item => ({ operationId: item.operationId, enabled: item.enabled })))
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
        await ScopeSettingsService.SaveModuleSettings(props.scopeId, new ModuleSettings({ authType, authData, wsProtocolConversion: wsProtocolConversion(), proxyConfig: proxyConfig(), tlsConfig: tlsConfig(), urlEncoding: urlEncoding(), timeoutMode: timeoutMode(), timeout: timeout(), followRedirects: followRedirects(), sendNoCacheHeaders: sendNoCacheHeaders(), params: mp, variables: mv, operations: ops }))
      } else {
        await ScopeSettingsService.SaveFolderSettings(props.scopeId, new FolderSettings({ authType, authData, wsProtocolConversion: wsProtocolConversion(), proxyConfig: proxyConfig(), tlsConfig: tlsConfig(), urlEncoding: urlEncoding(), timeoutMode: timeoutMode(), timeout: timeout(), followRedirects: followRedirects(), sendNoCacheHeaders: sendNoCacheHeaders(), operations: ops, inheritedOperations: [], operationOverrides: operationOverrides().map(item => new OperationOverride({ operationId: item.operationId, enabled: item.enabled })) }))
      }
      setLoadedFor("")
      props.onClose()
    } catch (e) { toastError(e, "error.op.saveFailed") } finally { setSaving(false) }
  }

  const tabs = () => {
    const base = [
      { key: "general", label: t("settings.general") },
      { key: "auth", label: tabLabelWithCount(t("endpoint.auth"), hasEffectiveAuth(auth(), hasInheritedAuth()) ? 1 : 0) },
      { key: "preOperations", label: tabLabelWithCount(t("op.stage.pre"), operations().filter(op => op.stage === "pre" && op.enabled).length + inheritedOperations().filter(item => item.operation.stage === "pre" && item.operation.enabled).length) },
      { key: "postOperations", label: tabLabelWithCount(t("op.stage.post"), operations().filter(op => op.stage === "post" && op.enabled).length + inheritedOperations().filter(item => item.operation.stage === "post" && item.operation.enabled).length) },
    ]
    if (props.scopeType === "module") base.splice(2, 0, { key: "params", label: t("scope.autoParams") }, { key: "variables", label: t("scope.variables") })
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

  const overrideInheritedOperation = (operationId: string, enabled: boolean | null) => {
    setInheritedOperations(items => items.map(item => item.operation.id === operationId ? {
      ...item,
      operation: { ...item.operation, enabled: enabled == null ? item.parentEnabled : enabled },
      overridden: enabled != null,
    } : item))
    setOperationOverrides(items => {
      const without = items.filter(item => item.operationId !== operationId)
      return enabled == null ? without : [...without, { operationId, enabled }]
    })
  }

  const booleanOptions = () => [
    { value: "inherit", label: t("inherit.parent") },
    { value: "true", label: t("common.on") },
    { value: "false", label: t("common.off") },
  ]
  const proxyOptions = () => [
    { value: "inherit", label: t("inherit.parent") },
    { value: "none", label: t("proxy.endpoint.none") },
    ...selectableProxies().map(p => ({ value: `ref:${p.scope}:${p.id}`, label: `${p.scope === "project" ? t("proxy.scope.project") : t("proxy.scope.global")} / ${p.name}` })),
  ]

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("scope.settingsTitle", { name: props.scopeName })} closeOnEsc closeOnOverlayClick width="640px">
      <div class="flex flex-col h-[70vh]">
        <div class="flex-1 min-h-0">
          <Tabs variant="line" tabs={tabs()} value={tab()} onChange={setTab}>
            {(key) => {
              if (key === "general") return (
                <div class="p-3 space-y-4 overflow-auto h-full">
                  <ScopeSelect label={t("request.timeout")} value={timeoutMode()} options={[
                    { value: "inherit", label: t("inherit.parent") },
                    { value: "value", label: t("request.timeout.value") },
                    { value: "unlimited", label: t("request.timeout.unlimited") },
                  ]} onChange={(value) => { setTimeoutMode(value); if (value === "value" && timeout() <= 0) setTimeout(30000) }} />
                  <Show when={timeoutMode() === "value"}>
                    <Input type="number" min="1" value={String(timeout())} onInput={(e) => setTimeout(Math.max(1, Number(e.currentTarget.value) || 1))} class="w-40" />
                  </Show>
                  <ScopeSelect label={t("request.followRedirects")} value={followRedirects() == null ? "inherit" : String(followRedirects())} onChange={(v) => setFollowRedirects(v === "inherit" ? null : v === "true")} options={booleanOptions()} />
                  <ScopeSelect label={t("request.noCache")} value={sendNoCacheHeaders() == null ? "inherit" : String(sendNoCacheHeaders())} onChange={(v) => setSendNoCacheHeaders(v === "inherit" ? null : v === "true")} options={booleanOptions()} />
                  <ScopeSelect label={t("proxy.endpoint.label")} value={proxyKeyFromJSON(proxyConfig())} onChange={(v) => setProxyConfig(proxyJSONFromKey(v))} options={proxyOptions()} />
                  <ScopeSelect label={t("tls.endpoint.label")} value={tlsModeFromJSON(tlsConfig())} onChange={(v) => setTLSConfig(tlsJSONFromMode(v))} options={[
                    { value: "inherit", label: t("inherit.parent") },
                    { value: "strict", label: t("tls.endpoint.strict") },
                    { value: "insecure", label: t("tls.endpoint.insecure") },
                  ]} />
                  <ScopeSelect label={t("urlEncoding.title")} value={urlEncoding()} onChange={setURLEncoding} options={[
                    { value: "inherit", label: t("inherit.parent") },
                    { value: "rfc3986", label: t("urlEncoding.rfc3986") },
                    { value: "whatwg", label: t("urlEncoding.whatwg") },
                    { value: "off", label: t("urlEncoding.off") },
                  ]} />
                  <ScopeSelect label={t("wsProtocol.title")} value={wsProtocolConversion()} onChange={setWSProtocolConversion} options={[
                    { value: "inherit", label: t("wsProtocol.inherit.parent") },
                    { value: "on", label: t("wsProtocol.on") },
                    { value: "off", label: t("wsProtocol.off") },
                  ]} />
                  <p class="text-xs text-muted-foreground">{t("inherit.folderChain.hint")}</p>
                </div>
              )
              if (key === "auth") return <AuthEditor value={auth()} onChange={setAuth} />
              if (key === "preOperations") return <OperationsEditor stage="pre" operations={operations()} inheritedOperations={inheritedOperations()} onInheritedOverride={overrideInheritedOperation} onChange={setOperations} projectId={props.projectId} />
              if (key === "postOperations") return <OperationsEditor stage="post" operations={operations()} inheritedOperations={inheritedOperations()} onInheritedOverride={overrideInheritedOperation} onChange={setOperations} projectId={props.projectId} />
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
