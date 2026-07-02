// 端点详情组件 - 上中下结构
// 上：请求方法 + URL + 发送/保存/删除按钮
// 中：请求设置 tabs (Params/Body/Headers/Auth/设置)
// 下：响应信息 tabs (Body/Headers/Cookies/实际请求)
import { Check, ChevronDown, Save, Send, Trash2 } from "lucide-solid"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Tabs } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { type AuthType, type BodyType, CONTENT_TYPES, type EndpointType, formatSize, formatTiming, getStatusColor, type HTTPMethod, METHOD_COLORS, type OperationStage, type OperationType, type ParamLocation } from "@/lib/types"
import { cn } from "@/lib/utils"

import { AuthEditor } from "./AuthEditor"
import { BodyEditor } from "./BodyEditor"
import { DocumentEditor } from "./DocumentEditor"
import { EndpointSettingsEditor } from "./EndpointSettingsEditor"
import { HeadersEditor } from "./HeadersEditor"
import { OperationsEditor } from "./OperationsEditor"
import { ParamsEditor } from "./ParamsEditor"
import { ResponsePanel } from "./ResponsePanel"
import { SSEPanel, WebSocketPanel } from "./StreamPanels"

/** HTTP 方法选项（用于 Combobox） */
const methodOptions: ComboboxOption[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
  { value: "HEAD", label: "HEAD" },
  { value: "OPTIONS", label: "OPTIONS" },
]

/** HTTP 方法颜色映射（输入框背景：文字颜色 + 半透明背景） */
const methodColors: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400 bg-green-500/10",
  POST: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10",
  PUT: "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10",
  DELETE: "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-400/10",
  PATCH: "text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-400/10",
  HEAD: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-400/10",
  OPTIONS: "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10",
}

/** 自定义方法的默认颜色 */
const defaultMethodColor = "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10"

/** 请求设置标签 */
function getRequestTabs() {
  return [
    { key: "params", label: t("endpoint.params") },
    { key: "body", label: t("endpoint.body") },
    { key: "headers", label: t("endpoint.headers") },
    { key: "auth", label: t("endpoint.auth") },
    { key: "script", label: t("endpoint.operations") },
    { key: "settings", label: t("endpoint.settings") },
  ]
}

/** 响应标签 */
function getResponseTabs() {
  return [
    { key: "body", label: t("response.body") },
    { key: "headers", label: t("response.headers") },
    { key: "cookies", label: t("response.cookies") },
    { key: "scripts", label: t("response.scripts") },
    { key: "actualRequest", label: t("response.actualRequest") },
  ]
}

export interface EndpointData {
  id: string
  name: string
  /** 端点类型：http / doc / websocket / sse */
  type: EndpointType
  method: HTTPMethod
  path: string
  bodyType: BodyType
  bodyContent: string
  contentType: string
  timeout: number
  followRedirects: boolean
  baseUrl: string
  params: ParamRow[]
  headers: HeaderRow[]
  bodyFields: BodyFieldRow[]
  auth: AuthState
  /** 前置脚本（请求发送前执行） */
  preRequestScript: string
  /** 后置脚本（响应返回后执行） */
  postResponseScript: string
  /** 文档正文（type=doc 时的 Markdown） */
  docContent: string
  /** 接口状态：developing / released / deprecated */
  status: string
  /** 标签（JSON 字符串数组） */
  tags: string
  /** 接口描述 */
  description: string
  /** 是否继承上级前置/后置操作 */
  inheritOperations: boolean
  /** 前置/后置操作列表 */
  operations: OperationRow[]
  /** 响应示例（不在此编辑，仅透传保存以免丢失） */
  examples: any[]
  /** 响应定义（不在此编辑，仅透传保存以免丢失） */
  schemas: any[]
}

/** 查询参数行（前端编辑态，id 仅用于列表 key，不入库） */
export interface ParamRow {
  id: string
  /** 参数位置：query / path / cookie */
  type: ParamLocation
  name: string
  value: string
  description: string
  enabled: boolean
  /** 值类型：string / integer / number / boolean / ... */
  dataType: string
  /** 是否必填 */
  required: boolean
  /** 示例值 */
  example: string
}

/** 请求头行 */
export interface HeaderRow {
  id: string
  name: string
  value: string
  description: string
  enabled: boolean
  required: boolean
  example: string
}

/** 前置/后置操作行 */
export interface OperationRow {
  id: string
  stage: OperationStage
  type: OperationType
  name: string
  enabled: boolean
  // script / libraryScript
  script: string
  libraryId: string
  // assert
  assertSource: string
  assertExpression: string
  assertComparison: string
  assertTarget: string
  // extractVar
  varName: string
  varScope: string
  varSource: string
  varExpression: string
  // wait
  waitMs: number
}

/** 创建一个空操作行 */
export function emptyOperation(stage: OperationStage, type: OperationType = "script"): OperationRow {
  return {
    id: crypto.randomUUID(), stage, type, name: "", enabled: true,
    script: "", libraryId: "",
    assertSource: "responseJson", assertExpression: "", assertComparison: "eq", assertTarget: "",
    varName: "", varScope: "environment", varSource: "responseJson", varExpression: "",
    waitMs: 1000,
  }
}

/** 请求体字段行（form-data / x-www-form-urlencoded） */
export interface BodyFieldRow {
  id: string
  name: string
  value: string
  fieldType: "text" | "file"
  enabled: boolean
  /** 文件名（fieldType=file 时有效） */
  fileName?: string
  /** 文件内容 base64（fieldType=file 时有效，不含 data: 前缀） */
  fileContent?: string
}

/** 认证编辑态 */
export interface AuthState {
  type: AuthType
  username: string
  password: string
  token: string
  /** API Key 认证 */
  apiKeyKey: string
  apiKeyValue: string
  apiKeyIn: string // header / query / cookie
}

/** 默认空认证 */
export function emptyAuth(): AuthState {
  return { type: "none", username: "", password: "", token: "", apiKeyKey: "", apiKeyValue: "", apiKeyIn: "header" }
}

/** 脚本控制台输出 */
export interface ScriptLog {
  level: string
  message: string
}

/** 单条断言结果 */
export interface ScriptTest {
  name: string
  passed: boolean
  error?: string
}

/** 单个脚本（前置或后置）的执行结果 */
export interface ScriptRunResult {
  executed: boolean
  logs: ScriptLog[]
  tests: ScriptTest[]
  error?: string
  duration: number
}

/** 前置/后置脚本执行结果集合 */
export interface ScriptResultsData {
  preRequest?: ScriptRunResult
  postResponse?: ScriptRunResult
}

export interface ResponseData {
  statusCode: number
  timing: { total: number; dnsLookup: number; tlsHandshake: number; tcpConnect: number; ttfb: number }
  size: number
  body: string
  /** 原始响应字节 base64，供按字符集解码（可能缺省，如历史记录） */
  rawBody?: string
  headers: Record<string, string[]>
  cookies: any[]
  contentType: string
  actualRequest: any
  /** 前置/后置脚本执行结果（无脚本时缺省） */
  scripts?: ScriptResultsData
  /** 请求失败时的错误信息（如协议错误、连接失败等）；有值时展示错误而非正常响应 */
  error?: string
}

/** 环境前置 URL 条目 */
export interface EnvironmentBaseURLOption {
  /** 环境 ID */
  environmentId: string
  /** 环境名称 */
  environmentName: string
  /** 前置 URL */
  baseUrl: string
}

export interface EndpointDetailProps {
  /** 端点数据 */
  endpoint: EndpointData
  /** 响应数据 */
  response?: ResponseData | null
  /** 是否正在发送请求 */
  sending?: boolean
  /** 是否为未保存请求 */
  isUnsaved?: boolean
  /** 发送请求回调 */
  onSend?: () => void
  /** 保存回调 */
  onSave?: () => void
  /** 删除回调 */
  onDelete?: () => void
  /** 数据变更回调 */
  onChange?: (data: Partial<EndpointData>) => void
  /** 当前环境 ID */
  currentEnvironmentId?: string
  /** 所有环境的前置 URL 列表 */
  environmentBaseUrls?: EnvironmentBaseURLOption[]
  /** 切换环境回调 */
  onEnvironmentChange?: (environmentId: string) => void
  /** 所属项目 ID（供操作编辑器读取脚本库） */
  projectId?: string
}

// 按端点 ID 持久化标签页状态，避免组件重新挂载时丢失
const tabStateStore = new Map<string, { requestTab: string; responseTab: string }>()

/**
 * EnvironmentBadge 环境切换徽章
 * 点击后弹出下拉菜单，展示所有环境的前置 URL，支持快捷切换
 */
function EnvironmentBadge(props: {
  baseUrl: string
  environmentBaseUrls?: EnvironmentBaseURLOption[]
  currentEnvironmentId?: string
  onEnvironmentChange?: (environmentId: string) => void
}) {
  const [open, setOpen] = createSignal(false)
  // 菜单定位（基于 trigger 元素底部左对齐）
  const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 })
  let badgeRef: HTMLSpanElement | undefined

  // 点击 Badge 时计算 trigger 位置并弹出菜单
  const handleBadgeClick = (e: MouseEvent) => {
    e.stopPropagation()
    // 如果只有一个或没有环境，不弹出菜单
    const urls = props.environmentBaseUrls
    if (!urls || urls.length <= 1) return
    // 基于 trigger 元素底部左对齐计算菜单位置
    if (badgeRef) {
      const rect = badgeRef.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setOpen(prev => !prev)
  }

  // 点击外部关闭
  createEffect(() => {
    if (open()) {
      const handler = (e: MouseEvent) => {
        if (badgeRef && !badgeRef.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener("click", handler)
      onCleanup(() => document.removeEventListener("click", handler))
    }
  })

  return (
    <>
      <span
        ref={badgeRef}
        class="inline-flex items-center gap-0.5 px-2 ml-1 my-1 text-xs bg-accent-muted text-accent rounded-sm cursor-pointer select-none hover:opacity-80 transition-opacity max-w-50 truncate"
        onClick={handleBadgeClick}
        title={props.baseUrl}
      >
        <span class="truncate">{props.baseUrl}</span>
      </span>

      {/* 环境选择下拉菜单 */}
      <Show when={open()}>
        <div
          class="fixed inset-0 z-40"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}
        />
        <div
          class="fixed z-50 min-w-80 bg-surface border border-border rounded-md shadow-lg p-1 flex flex-col gap-0.5"
          style={{ left: `${menuPos().x}px`, top: `${menuPos().y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <For each={props.environmentBaseUrls}>
            {(item) => {
              const isActive = item.environmentId === props.currentEnvironmentId
              return (
                <div
                  class={cn(
                    "flex items-center gap-1 px-1.5 py-1 text-sm cursor-pointer transition-colors rounded-sm select-none",
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    props.onEnvironmentChange?.(item.environmentId)
                    setOpen(false)
                  }}
                >
                  {/* 左侧：复选标记 - 当前环境显示勾选图标，其他留空占位 */}
                  <span class="w-4 shrink-0 flex items-center justify-center">
                    <Show when={isActive}>
                      <Check class="w-3.5 h-3.5" />
                    </Show>
                  </span>
                  {/* 中间：前置 URL（常规字体，弹性撑满） */}
                  <span class="truncate text-sm flex-1 min-w-0">{item.baseUrl || "/"}</span>
                  {/* 右侧：环境名称（低对比度） */}
                  <span class="text-xs text-muted-foreground shrink-0">{item.environmentName}</span>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </>
  )
}

/**
 * EndpointDetail 端点详情组件
 */
export function EndpointDetail(props: EndpointDetailProps) {
  const ep = () => props.endpoint

  // 初始化标签页状态（从持久化存储恢复，或使用默认值）
  const [activeRequestTab, setActiveRequestTab] = createSignal("params")
  const [activeResponseTab, setActiveResponseTab] = createSignal("body")

  // 初始化标签页状态（从持久化存储恢复，或使用默认值）
  createEffect(on(
    () => ep().id,
    (id) => {
      const saved = tabStateStore.get(id)
      if (saved) {
        setActiveRequestTab(saved.requestTab)
        setActiveResponseTab(saved.responseTab)
      } else {
        setActiveRequestTab("params")
        setActiveResponseTab("body")
      }
    },
  ))

  // 标签页变化时，保存到持久化存储（仅跟踪标签变化，不跟踪端点 ID 变化）
  createEffect(on(
    () => [activeRequestTab(), activeResponseTab()],
    ([requestTab, responseTab]) => {
      tabStateStore.set(ep().id, { requestTab, responseTab })
    },
  ))

  // 非 HTTP 端点（文档 / WebSocket / SSE）的头部：名称/路径 + 保存/删除
  const NonHttpHeader = (headerProps: { showPath?: boolean }) => (
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      <Input
        size="sm"
        value={headerProps.showPath ? ep().path : ep().name}
        onInput={(e) => props.onChange?.(headerProps.showPath ? { path: e.currentTarget.value } : { name: e.currentTarget.value })}
        placeholder={headerProps.showPath ? "wss://example.com/socket" : t("endpoint.name")}
        class="flex-1"
      />
      <Button variant={props.isUnsaved ? "default" : "outline"} size="sm" onClick={props.onSave}>
        <Save class="h-3.5 w-3.5" />
        {props.isUnsaved ? t("endpoint.saveToProject") : t("endpoint.save")}
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={props.onDelete}>
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  )

  // 文档类型：Markdown 编辑器
  if (ep().type === "doc") {
    return (
      <div class="flex flex-col h-full">
        <NonHttpHeader />
        <div class="flex-1 min-h-0">
          <DocumentEditor content={ep().docContent} onChange={(v) => props.onChange?.({ docContent: v })} />
        </div>
      </div>
    )
  }

  // WebSocket 类型
  if (ep().type === "websocket") {
    return (
      <div class="flex flex-col h-full">
        <NonHttpHeader showPath />
        <div class="flex-1 min-h-0">
          <WebSocketPanel connId={ep().id} baseUrl={ep().baseUrl} path={ep().path} />
        </div>
      </div>
    )
  }

  // SSE 类型
  if (ep().type === "sse") {
    return (
      <div class="flex flex-col h-full">
        <NonHttpHeader showPath />
        <div class="flex-1 min-h-0">
          <SSEPanel connId={ep().id} baseUrl={ep().baseUrl} path={ep().path} method={ep().method} body={ep().bodyContent} />
        </div>
      </div>
    )
  }

  return (
    <div class="flex flex-col h-full">
      {/* 上部：请求行 */}
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        {/* 内嵌方法选择器的 URL 输入组 */}
        <div class="flex-1 flex items-stretch border border-border rounded-md bg-input">
          {/* HTTP 方法选择器（Combobox：点击后弹出空白输入框，支持搜索筛选和自定义输入） */}
          <Combobox
            options={methodOptions}
            value={ep().method}
            onChange={(val) => props.onChange?.({ method: val as HTTPMethod })}
            minWidth="78px"
            customLabel={(val) => val}
            displayClass={methodColors[ep().method] || defaultMethodColor}
            optionTextClass={(val) => METHOD_COLORS[val] || "text-gray-600 dark:text-gray-400"}
            class="rounded-l shrink-0"
          />

          {/* 分隔线 */}
          <div class="w-px self-stretch bg-border shrink-0" />

          {/* 前置 baseUrl 环境切换 Badge */}
          <Show when={ep().baseUrl}>
            <EnvironmentBadge
              baseUrl={ep().baseUrl}
              environmentBaseUrls={props.environmentBaseUrls}
              currentEnvironmentId={props.currentEnvironmentId}
              onEnvironmentChange={props.onEnvironmentChange}
            />
          </Show>

          {/* 端点路径 */}
          <Input
            size="sm"
            value={ep().path}
            onInput={(e) => props.onChange?.({ path: e.currentTarget.value })}
            placeholder="/api/endpoint"
            class="border-0 bg-transparent rounded-none flex-1 min-w-0"
          />
        </div>

        {/* 操作按钮 */}
        <Tooltip content="Ctrl+Enter">
          <Button size="sm" onClick={props.onSend} disabled={props.sending}>
            <Send class="h-3.5 w-3.5" />
            {props.sending ? t("common.sending") : t("endpoint.send")}
          </Button>
        </Tooltip>
        <Button variant={props.isUnsaved ? "default" : "outline"} size="sm" onClick={props.onSave}>
          <Save class="h-3.5 w-3.5" />
          {props.isUnsaved ? t("endpoint.saveToProject") : t("endpoint.save")}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onDelete}>
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 中部：请求设置 */}
      <div class="flex-1 overflow-hidden border-b border-border">
        <Tabs
          tabs={getRequestTabs()}
          value={activeRequestTab()}
          onChange={setActiveRequestTab}
        >
          {(key) => {
            switch (key) {
              case "params": return <ParamsEditor value={ep().params} onChange={(v) => props.onChange?.({ params: v })} />
              case "body": return <BodyEditor
                bodyType={ep().bodyType}
                bodyContent={ep().bodyContent}
                contentType={ep().contentType}
                fields={ep().bodyFields}
                onChange={(patch) => props.onChange?.(patch)}
              />
              case "headers": return <HeadersEditor value={ep().headers} onChange={(v) => props.onChange?.({ headers: v })} />
              case "auth": return <AuthEditor value={ep().auth} onChange={(v) => props.onChange?.({ auth: v })} />
              case "script": return <OperationsEditor
                operations={ep().operations}
                onChange={(ops) => props.onChange?.({ operations: ops })}
                projectId={props.projectId}
              />
              case "settings": return <EndpointSettingsEditor
                timeout={ep().timeout}
                followRedirects={ep().followRedirects}
                onChange={(patch) => props.onChange?.(patch)}
              />
              default: return null
            }
          }}
        </Tabs>
      </div>

      {/* 下部：响应信息 */}
      <div class="flex-1 overflow-hidden min-h-50">
        <Show
          when={props.response}
          fallback={
            <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t("endpoint.sendToViewResponse")}
            </div>
          }
        >
          {/* 请求失败：展示错误信息，而非正常的响应标签页 */}
          <Show
            when={!props.response!.error}
            fallback={
              <div class="flex flex-col h-full">
                <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
                  <Badge class="bg-red-500/15 text-red-600 dark:text-red-400">{t("response.failed")}</Badge>
                </div>
                <div class="flex-1 overflow-auto p-3">
                  <pre class="text-sm font-mono whitespace-pre-wrap break-all text-red-600 dark:text-red-400">
                    {props.response!.error}
                  </pre>
                </div>
              </div>
            }
          >
            <Tabs
              tabs={getResponseTabs()}
              value={activeResponseTab()}
              onChange={setActiveResponseTab}
              extra={
                <div class="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge class={getStatusColor(props.response!.statusCode)}>
                    {props.response!.statusCode}
                  </Badge>
                  <span>{formatTiming(props.response!.timing?.total || 0)}</span>
                  <span>{formatSize(props.response!.size || 0)}</span>
                </div>
              }
            >
              {(key) => (
                <ResponsePanel
                  tab={key}
                  response={props.response!}
                />
              )}
            </Tabs>
          </Show>
        </Show>
      </div>
    </div>
  )
}
