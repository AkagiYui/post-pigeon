// 端点详情组件 - 上中下结构
// 上：请求方法 + URL + 发送/保存/删除按钮
// 中：请求设置 tabs (Params/Body/Headers/Auth/设置)
// 下：响应信息 tabs (Body/Headers/Cookies/实际请求)
import { Icon } from "@iconify-icon/solid"
import { createEffect, createMemo, createSignal, For, type JSX, on, onCleanup, Show } from "solid-js"

import { HTTPService, WebSocketService } from "@/../bindings/PostPigeon/internal/services"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { HoverCard } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Tabs } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { formatFromContentType } from "@/lib/format"
import { getStatusInfo, statusClass } from "@/lib/http-status"
import { type AuthType, type BodyType, CONTENT_TYPES, type EndpointType, formatSize, formatTiming, getStatusColor, type HTTPMethod, METHOD_COLORS, type OperationStage, type OperationType, type ParamLocation } from "@/lib/types"
import { byteLength, cn, extractPathParams, hasURLScheme } from "@/lib/utils"
import { responseLayout, setResponseLayout } from "@/stores/app"
import { markConnecting, streamStatus } from "@/stores/stream"

import { AuthEditor } from "./AuthEditor"
import { BodyEditor } from "./BodyEditor"
import { DocumentEditor } from "./DocumentEditor"
import { EndpointSettingsEditor } from "./EndpointSettingsEditor"
import { HeadersEditor } from "./HeadersEditor"
import { OperationsEditor } from "./OperationsEditor"
import { CookiesEditor, ParamsEditor } from "./ParamsEditor"
import { ResponseBodyToolbar, ResponsePanel } from "./ResponsePanel"
import { StreamEventLog, WebSocketResponse, wsUrl } from "./StreamPanels"

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

/** 请求设置标签 key（用于持久化状态校验） */
const REQUEST_TAB_KEYS = ["params", "cookies", "body", "headers", "auth", "preOperations", "postOperations", "settings"]

/** 带数字徽标的标签标题：count>0 时在标题右侧显示计数气泡 */
function tabLabelWithCount(label: string, count: number): JSX.Element {
  return (
    <span class="inline-flex items-center gap-1.5">
      {label}
      <Show when={count > 0}>
        <span class="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent-muted text-accent text-[10px] font-medium leading-none tabular-nums">
          {count}
        </span>
      </Show>
    </span>
  )
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
  /** 本接口禁用的全局(模块) query 参数名列表（仅影响本接口） */
  disabledGlobalParams: string[]
  /** 接口级代理选择（EndpointProxy 的 JSON，空表示 inherit 跟随项目） */
  proxyConfig: string
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

/** 请求各阶段计时（毫秒，含亚毫秒精度） */
export interface TimingData {
  total: number
  dnsLookup: number
  tlsHandshake: number
  tcpConnect: number
  ttfb: number
  /** 准备/阻塞：请求开始 → 开始建立连接 */
  stalled: number
  /** 等待：请求发出 → 收到首字节 */
  wait: number
  /** 下载内容：首字节 → 读取完成 */
  download: number
  /** 连接是否复用（DNS/TCP/TLS 命中缓存） */
  reused: boolean
}

export interface ResponseData {
  statusCode: number
  timing: TimingData
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
  /** 响应为 SSE 流：以实时事件流展示（Body 为空，事件按 streamId 推送） */
  streaming?: boolean
  /** SSE 流连接标识 */
  streamId?: string
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
  /** 模块级"全局" query 参数（只读展示于参数 tab） */
  globalQueryParams?: { name: string; value: string }[]
  /** 从模块/文件夹链继承的、已启用的前置/后置操作数量（用于操作/参数 tab 计数包含"全局"部分） */
  inheritedOpCounts?: { pre: number; post: number }
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
        class={cn(
          "inline-flex items-center gap-1 h-6 px-2 text-xs rounded cursor-pointer select-none transition-colors min-w-0 shrink max-w-50",
          props.baseUrl
            ? "text-accent bg-accent-muted hover:bg-accent-muted/70"
            : "text-muted-foreground hover:bg-hover",
        )}
        onClick={handleBadgeClick}
        title={props.baseUrl || t("endpoint.baseUrl.notSet")}
      >
        {/* 图标始终显示；标题在空间不足时被挤压隐藏，仅剩图标 */}
        <Icon icon="lucide:link-2" class="h-3 w-3 shrink-0" />
        <span class="truncate min-w-0">{props.baseUrl || t("endpoint.baseUrl.notSet")}</span>
      </span>

      {/* 环境选择下拉菜单 */}
      <Show when={open()}>
        <div
          class="fixed inset-0 z-40"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}
        />
        <div
          class="anim-pop-in fixed z-50 min-w-80 bg-popover border border-border rounded-md shadow-xl p-1 flex flex-col gap-0.5"
          style={{ left: `${menuPos().x}px`, top: `${menuPos().y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <For each={props.environmentBaseUrls}>
            {(item) => {
              const isActive = item.environmentId === props.currentEnvironmentId
              return (
                <div
                  class={cn(
                    "flex items-center gap-1 px-1.5 py-1 text-sm cursor-pointer transition-colors rounded select-none",
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-foreground hover:bg-hover",
                  )}
                  onClick={() => {
                    props.onEnvironmentChange?.(item.environmentId)
                    setOpen(false)
                  }}
                >
                  {/* 左侧：复选标记 - 当前环境显示勾选图标，其他留空占位 */}
                  <span class="w-4 shrink-0 flex items-center justify-center">
                    <Show when={isActive}>
                      <Icon icon="lucide:check" class="w-3.5 h-3.5" />
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
        // 兼容旧缓存（如已废弃的 "script" tab）：非法 key 回退到 params
        setActiveRequestTab(REQUEST_TAB_KEYS.includes(saved.requestTab) ? saved.requestTab : "params")
        setActiveResponseTab(saved.responseTab)
      } else {
        setActiveRequestTab("params")
        setActiveResponseTab("body")
      }
    },
  ))

  // 前置/后置操作的启用数量（含从模块/文件夹链继承的全局操作，用于 tab 标题数字徽标）
  const preOpsCount = () =>
    ep().operations.filter(o => o.stage === "pre" && o.enabled).length
    + (ep().inheritOperations ? (props.inheritedOpCounts?.pre ?? 0) : 0)
  const postOpsCount = () =>
    ep().operations.filter(o => o.stage === "post" && o.enabled).length
    + (ep().inheritOperations ? (props.inheritedOpCounts?.post ?? 0) : 0)

  // 参数 tab 启用数量：接口独有的 query + 自动识别的 path + 启用的全局 query 参数
  const paramsCount = () => {
    const q = ep().params.filter(p => p.type === "query" && p.enabled && p.name.trim()).length
    const path = extractPathParams(ep().path).length
    const disabled = new Set(ep().disabledGlobalParams ?? [])
    const g = (props.globalQueryParams ?? []).filter(gp => !disabled.has(gp.name)).length
    return q + path + g
  }

  // 请求设置标签（前置/后置操作作为顶级 tab，位于认证与设置之间）
  const requestTabs = createMemo(() => [
    { key: "params", label: tabLabelWithCount(t("endpoint.params"), paramsCount()) },
    { key: "cookies", label: t("endpoint.cookies") },
    { key: "body", label: t("endpoint.body") },
    { key: "headers", label: t("endpoint.headers") },
    { key: "auth", label: t("endpoint.auth") },
    { key: "preOperations", label: tabLabelWithCount(t("op.stage.pre"), preOpsCount()) },
    { key: "postOperations", label: tabLabelWithCount(t("op.stage.post"), postOpsCount()) },
    { key: "settings", label: t("endpoint.settings") },
  ])

  // 标签页变化时，保存到持久化存储（仅跟踪标签变化，不跟踪端点 ID 变化）
  createEffect(on(
    () => [activeRequestTab(), activeResponseTab()],
    ([requestTab, responseTab]) => {
      tabStateStore.set(ep().id, { requestTab, responseTab })
    },
  ))

  // ---- 响应体渲染状态（提升到详情层，以便工具栏可在“面板内独立行”与“标签栏状态码左侧”两处渲染） ----
  const [renderMode, setRenderMode] = createSignal("pretty")
  const [format, setFormat] = createSignal("json")
  const [encoding, setEncoding] = createSignal("utf-8")

  // 新响应到达时，按 Content-Type 自动选择格式化方案（用户随后可手动切换，直到下一个响应）
  createEffect(on(() => props.response?.contentType, (ct) => {
    const auto = formatFromContentType(ct)
    if (auto) setFormat(auto)
  }))

  // ---- 响应区尺寸调整 / 收起（上下布局调高度，左右布局调宽度） ----
  const MIN_RESPONSE_H = 140 // 上下布局最低高度
  const MIN_RESPONSE_W = 280 // 左右布局最低宽度
  const COLLAPSE_DRAG = 48 // 拖到最低尺寸后再往下/右拖这么多则收起
  const [responseHeight, setResponseHeight] = createSignal(300)
  const [responseWidth, setResponseWidth] = createSignal(480)
  const [responseCollapsed, setResponseCollapsed] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  const startResponseResize = (e: MouseEvent) => {
    e.preventDefault()
    const horizontal = responseLayout() === "right"
    const min = horizontal ? MIN_RESPONSE_W : MIN_RESPONSE_H
    const start = horizontal ? e.clientX : e.clientY
    const startSize = horizontal ? responseWidth() : responseHeight()
    const setSize = horizontal ? setResponseWidth : setResponseHeight
    // 上限：给请求行与中部设置区至少留出空间
    const extent = horizontal
      ? (containerRef ? containerRef.clientWidth : window.innerWidth)
      : (containerRef ? containerRef.clientHeight : window.innerHeight)
    const max = extent - 180
    const onMove = (ev: MouseEvent) => {
      const cur = horizontal ? ev.clientX : ev.clientY
      const next = startSize + (start - cur) // 手柄向左/上移动增大响应区
      if (next < min - COLLAPSE_DRAG) {
        // 拖到最低尺寸以下一段距离：收起，仅保留展开手柄
        setResponseCollapsed(true)
        cleanup()
        return
      }
      setSize(Math.max(min, Math.min(next, Math.max(min, max))))
    }
    const cleanup = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", cleanup)
      document.body.classList.remove("dragging")
    }
    document.body.classList.add("dragging")
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", cleanup)
  }
  onCleanup(() => document.body.classList.remove("dragging"))

  // 布局切换按钮（上下 <-> 左右）：放在响应头右侧，供各响应状态复用
  const LayoutToggle = () => (
    <Tooltip content={t("response.toggleLayout")}>
      <button
        class="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setResponseLayout(responseLayout() === "bottom" ? "right" : "bottom")}
      >
        <Icon icon={responseLayout() === "bottom" ? "lucide:panel-right" : "lucide:panel-bottom"} class="h-4 w-4" />
      </button>
    </Tooltip>
  )

  // 发送请求时若响应区处于收起状态，自动展开
  createEffect(on(() => props.sending, (s) => { if (s) setResponseCollapsed(false) }, { defer: true }))

  // ---- WebSocket：连接/断开由顶部请求行的按钮驱动，连接存活于 Go 侧 ----
  const isWs = () => ep().type === "websocket"
  const wsStatus = () => streamStatus(ep().id)
  const wsHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {}
    for (const x of ep().headers) if (x.enabled && x.name.trim()) h[x.name] = x.value
    return h
  }
  const wsConnect = async () => {
    markConnecting(ep().id)
    // 传入接口级代理选择：WebSocket 与普通请求一样按「接口→项目→全局」解析生效代理
    try { await WebSocketService.Connect(ep().id, wsUrl(ep().baseUrl, ep().path), wsHeaders(), ep().proxyConfig || "") } catch (e) { console.error("WebSocket 连接失败", e) }
  }
  const wsDisconnect = async () => { try { await WebSocketService.Close(ep().id) } catch (e) { console.error(e) } }
  // 停止流式响应（响应体为 text/event-stream 的流式 HTTP 响应）
  const stopStream = async () => {
    const id = props.response?.streamId
    if (!id) return
    try { await HTTPService.StopStream(id) } catch (e) { console.error(e) }
  }

  // 文档头部：名称 + 保存/删除
  const DocHeader = () => (
    <div class="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      <Input
        size="sm"
        value={ep().name}
        onInput={(e) => props.onChange?.({ name: e.currentTarget.value })}
        placeholder={t("endpoint.name")}
        class="flex-1"
      />
      <Button variant={props.isUnsaved ? "default" : "outline"} size="sm" onClick={props.onSave}>
        <Icon icon="lucide:save" class="h-3.5 w-3.5" />
        {props.isUnsaved ? t("endpoint.saveToProject") : t("endpoint.save")}
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={props.onDelete}>
        <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
      </Button>
    </div>
  )

  // 文档使用 Markdown 编辑器；HTTP 与 WebSocket 共用同一详情布局（仅动作按钮与响应区不同）。
  return (
    <Show when={ep().type === "doc"} fallback={
      <div class="flex flex-col h-full" ref={containerRef}>
        {/* 上部：请求行 */}
        <div class="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
          {/* 内嵌方法选择器的 URL 输入组（Apifox 风格）：灰底圆角外框，内部方法为彩色小药丸，
              路径输入透明加粗，环境徽章作为内嵌段落。 */}
          <div class="flex-1 flex items-center gap-1 h-8 px-1 border border-border rounded-md bg-surface-alt transition-colors hover:border-control-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            {/* HTTP 方法选择器（彩色药丸 + 下拉小箭头） */}
            <Combobox
              options={methodOptions}
              value={ep().method}
              onChange={(val) => props.onChange?.({ method: val as HTTPMethod })}
              minWidth="72px"
              caret
              customLabel={(val) => val}
              displayClass={methodColors[ep().method] || defaultMethodColor}
              optionTextClass={(val) => METHOD_COLORS[val] || "text-gray-600 dark:text-gray-400"}
              class="h-6 shrink-0 self-center"
            />

            {/* 前置 baseUrl 环境切换按钮：仅取决于接口路径是否带协议头。
              只要是相对地址（不含协议头）就显示；当前环境该模块未设置 baseUrl 时显示"未设置"。 */}
            <Show when={!hasURLScheme(ep().path)}>
              <EnvironmentBadge
                baseUrl={ep().baseUrl}
                environmentBaseUrls={props.environmentBaseUrls}
                currentEnvironmentId={props.currentEnvironmentId}
                onEnvironmentChange={props.onEnvironmentChange}
              />
            </Show>

            {/* 端点路径（透明、加粗，与 Apifox 一致） */}
            <Input
              size="sm"
              value={ep().path}
              onInput={(e) => props.onChange?.({ path: e.currentTarget.value })}
              placeholder={isWs() ? "wss://example.com/socket" : "/api/endpoint"}
              class="border-0 bg-transparent rounded-none flex-1 min-w-0 font-semibold hover:border-0 focus-visible:ring-0"
            />
          </div>

          {/* 主操作：HTTP 为发送；WebSocket 为连接/断开 */}
          <Show when={isWs()} fallback={
            <Tooltip content="Ctrl+Enter">
              <Button size="sm" onClick={props.onSend} disabled={props.sending}>
                <Icon icon="lucide:send" class="h-3.5 w-3.5" />
                {props.sending ? t("common.sending") : t("endpoint.send")}
              </Button>
            </Tooltip>
          }>
            <Show when={wsStatus() === "open"} fallback={
              <Button size="sm" onClick={wsConnect}><Icon icon="lucide:plug-zap" class="h-3.5 w-3.5" />{t("stream.connect")}</Button>
            }>
              <Button size="sm" variant="outline" onClick={wsDisconnect}><Icon icon="lucide:plug" class="h-3.5 w-3.5" />{t("stream.disconnect")}</Button>
            </Show>
          </Show>
          <Button variant={props.isUnsaved ? "default" : "outline"} size="sm" onClick={props.onSave}>
            <Icon icon="lucide:save" class="h-3.5 w-3.5" />
            {props.isUnsaved ? t("endpoint.saveToProject") : t("endpoint.save")}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={props.onDelete}>
            <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* 请求设置 + 响应区：按布局在“上下结构”(flex-col) 与“左右结构”(flex-row) 间切换 */}
        <div class={cn("flex-1 min-h-0 flex", responseLayout() === "right" ? "flex-row" : "flex-col")}>
          {/* 请求设置（HTTP 与 WebSocket 完全一致） */}
          <div class={cn("flex-1 min-h-0 min-w-0 overflow-hidden", responseLayout() === "right" ? "border-r border-border" : "border-b border-border")}>
            <Tabs
              tabs={requestTabs()}
              value={activeRequestTab()}
              onChange={setActiveRequestTab}
            >
              {(key) => {
                switch (key) {
                  case "params": return <ParamsEditor
                    value={ep().params}
                    onChange={(v) => props.onChange?.({ params: v })}
                    path={ep().path}
                    globalQueryParams={props.globalQueryParams}
                    disabledGlobalParams={ep().disabledGlobalParams}
                    onDisabledGlobalParamsChange={(names) => props.onChange?.({ disabledGlobalParams: names })}
                  />
                  case "cookies": return <CookiesEditor value={ep().params} onChange={(v) => props.onChange?.({ params: v })} />
                  case "body": return <BodyEditor
                    bodyType={ep().bodyType}
                    bodyContent={ep().bodyContent}
                    contentType={ep().contentType}
                    fields={ep().bodyFields}
                    onChange={(patch) => props.onChange?.(patch)}
                  />
                  case "headers": return <HeadersEditor value={ep().headers} onChange={(v) => props.onChange?.({ headers: v })} />
                  case "auth": return <AuthEditor value={ep().auth} onChange={(v) => props.onChange?.({ auth: v })} />
                  case "preOperations": return <OperationsEditor
                    stage="pre"
                    operations={ep().operations}
                    onChange={(ops) => props.onChange?.({ operations: ops })}
                    projectId={props.projectId}
                  />
                  case "postOperations": return <OperationsEditor
                    stage="post"
                    operations={ep().operations}
                    onChange={(ops) => props.onChange?.({ operations: ops })}
                    projectId={props.projectId}
                  />
                  case "settings": return <EndpointSettingsEditor
                    timeout={ep().timeout}
                    followRedirects={ep().followRedirects}
                    status={ep().status}
                    tags={ep().tags}
                    description={ep().description}
                    proxyConfig={ep().proxyConfig}
                    projectId={props.projectId}
                    onChange={(patch) => props.onChange?.(patch)}
                  />
                  default: return null
                }
              }}
            </Tabs>
          </div>

          {/* 响应区：可拖拽调整尺寸、可收起为手柄。WebSocket 为消息流；HTTP 为响应标签页或 SSE 实时事件流。
            上下布局下位于设置区下方；左右布局下位于设置区右侧 */}
          <Show
            when={!responseCollapsed()}
            fallback={
              <button
                class={cn(
                  "shrink-0 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                  responseLayout() === "right" ? "w-8 flex-col border-l border-border" : "h-8 border-t border-border",
                )}
                onClick={() => setResponseCollapsed(false)}
              >
                <Icon icon={responseLayout() === "right" ? "lucide:chevron-left" : "lucide:chevron-up"} class="h-3.5 w-3.5" />
                <span class={responseLayout() === "right" ? "[writing-mode:vertical-rl]" : ""}>{t("response.expandPanel")}</span>
              </button>
            }
          >
            {/* 拖拽手柄：上下布局调高度、左右布局调宽度，拖到最低再继续拖即收起 */}
            <div
              class={cn(
                "shrink-0 bg-border hover:bg-accent/40 relative group",
                responseLayout() === "right" ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
              )}
              onMouseDown={startResponseResize}
            >
              <div class={cn("absolute z-10", responseLayout() === "right" ? "inset-y-0 -left-1.5 -right-1.5" : "inset-x-0 -top-1.5 -bottom-1.5")} />
              <div class={cn(
                "absolute rounded-full bg-border group-hover:bg-accent/60 transition-colors",
                responseLayout() === "right" ? "top-1/2 -translate-y-1/2 -left-[3px] w-[6px] h-8" : "left-1/2 -translate-x-1/2 -top-[3px] h-[6px] w-8",
              )} />
            </div>
            <div class="shrink-0 overflow-hidden" style={responseLayout() === "right" ? { width: `${responseWidth()}px` } : { height: `${responseHeight()}px` }}>
              <Show when={isWs()} fallback={
                <Show
                  when={props.response}
                  fallback={
                    <div class="relative h-full">
                      <div class="absolute top-1.5 right-2 z-10"><LayoutToggle /></div>
                      <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {t("endpoint.sendToViewResponse")}
                      </div>
                    </div>
                  }
                >
                  {/* SSE 流式响应：实时事件流 */}
                  <Show when={props.response!.streaming} fallback={
                  /* 请求失败：展示错误信息，而非正常的响应标签页 */
                    <Show
                      when={!props.response!.error}
                      fallback={
                        <div class="flex flex-col h-full">
                          <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
                            <Badge class="bg-red-500/15 text-red-600 dark:text-red-400">{t("response.failed")}</Badge>
                            <div class="ml-auto"><LayoutToggle /></div>
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
                            {/* 上下布局：响应体工具栏移到状态码左侧，避免单独占一行（左右布局时工具栏留在面板内） */}
                            <Show when={responseLayout() === "bottom" && activeResponseTab() === "body"}>
                              <ResponseBodyToolbar
                                renderMode={renderMode()}
                                onRenderModeChange={setRenderMode}
                                format={format()}
                                onFormatChange={setFormat}
                                encoding={encoding()}
                                onEncodingChange={setEncoding}
                              />
                            </Show>
                            {/* 状态码：hover 展示该状态码的名称与释义 */}
                            <HoverCard content={<ResponseStatusCard code={props.response!.statusCode} />}>
                              <Badge class={cn(getStatusColor(props.response!.statusCode), "cursor-help")}>
                                {props.response!.statusCode}
                              </Badge>
                            </HoverCard>
                            {/* 耗时：hover 展示各阶段耗时 */}
                            <HoverCard content={<ResponseTimingCard timing={props.response!.timing} />}>
                              <span class="cursor-help border-b border-dotted border-muted-foreground/40 hover:text-foreground transition-colors">
                                {formatTiming(props.response!.timing?.total || 0)}
                              </span>
                            </HoverCard>
                            {/* 大小：hover 展示请求/响应的头与体大小 */}
                            <HoverCard content={<ResponseSizeCard response={props.response!} />}>
                              <span class="cursor-help border-b border-dotted border-muted-foreground/40 hover:text-foreground transition-colors">
                                {formatSize(props.response!.size || 0)}
                              </span>
                            </HoverCard>
                            {/* 布局切换按钮（上下 / 左右） */}
                            <LayoutToggle />
                          </div>
                        }
                      >
                        {(key) => (
                          <ResponsePanel
                            tab={key}
                            response={props.response!}
                            renderMode={renderMode()}
                            format={format()}
                            encoding={encoding()}
                            showToolbar={responseLayout() === "right"}
                            onRenderModeChange={setRenderMode}
                            onFormatChange={setFormat}
                            onEncodingChange={setEncoding}
                          />
                        )}
                      </Tabs>
                    </Show>
                  }>
                    <StreamEventLog streamId={props.response!.streamId!} onStop={stopStream} />
                  </Show>
                </Show>
              }>
                <WebSocketResponse connId={ep().id} />
              </Show>
            </div>
          </Show>
        </div>
      </div>
    }>
      {/* 文档：Markdown 编辑/预览 */}
      <div class="flex flex-col h-full">
        <DocHeader />
        <div class="flex-1 min-h-0">
          <DocumentEditor content={ep().docContent} onChange={(v) => props.onChange?.({ docContent: v })} />
        </div>
      </div>
    </Show>
  )
}

/** 响应耗时卡片：展示各阶段耗时（准备 / DNS / TCP / TLS / 等待 / 下载） */
function ResponseTimingCard(props: { timing: TimingData }) {
  const tm = () => props.timing
  const phases = () => {
    const v = tm()
    return [
      { label: t("timing.stalled"), value: v.stalled, cacheable: false },
      { label: t("timing.dns"), value: v.dnsLookup, cacheable: true },
      { label: t("timing.tcp"), value: v.tcpConnect, cacheable: true },
      { label: t("timing.tls"), value: v.tlsHandshake, cacheable: true },
      { label: t("timing.wait"), value: v.wait, cacheable: false },
      { label: t("timing.download"), value: v.download, cacheable: false },
    ]
  }
  const total = () => tm().total || phases().reduce((a, p) => a + Math.max(0, p.value), 0)
  return (
    <div class="w-64 flex flex-col gap-1.5">
      <div class="flex items-center justify-between pb-1.5 border-b border-border">
        <span class="text-xs font-medium text-foreground">{t("response.time")}</span>
        <span class="text-xs font-semibold tabular-nums text-foreground">{formatTiming(total())}</span>
      </div>
      <For each={phases()}>
        {(p) => {
          const isCache = () => tm().reused && p.cacheable && p.value <= 0
          const pct = () => total() > 0 ? Math.min(100, Math.max(0, p.value) / total() * 100) : 0
          return (
            <div class="flex items-center gap-2 text-xs">
              <span class="w-16 shrink-0 text-muted-foreground truncate">{p.label}</span>
              <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <Show when={!isCache() && p.value > 0}>
                  <div class="h-full rounded-full bg-accent" style={{ width: `${pct()}%` }} />
                </Show>
              </div>
              <span class="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                {isCache() ? t("timing.cache") : formatTiming(Math.max(0, p.value))}
              </span>
            </div>
          )
        }}
      </For>
    </div>
  )
}

/** 状态码释义卡片：状态码 + 原因短语 + 分类标签 + 详细说明 */
function ResponseStatusCard(props: { code: number }) {
  const info = () => getStatusInfo(props.code)
  const categoryLabel = () => t(`status.category.${statusClass(props.code)}`)
  return (
    <div class="w-72 flex flex-col gap-2">
      <div class="flex items-center gap-2 pb-1.5 border-b border-border">
        <Badge class={getStatusColor(props.code)}>{props.code}</Badge>
        <span class="text-sm font-semibold text-foreground truncate">{info()?.name ?? t("status.unknown")}</span>
        <span class="ml-auto shrink-0 text-[10px] text-muted-foreground">{categoryLabel()}</span>
      </div>
      <p class="text-xs text-muted-foreground leading-relaxed">{info()?.detail ?? t("status.noDetail")}</p>
    </div>
  )
}

/** 响应/请求大小卡片：分别展示请求头/体与响应头/体的大小 */
function ResponseSizeCard(props: { response: ResponseData }) {
  const r = () => props.response
  // 响应头字节：按 "name: value\r\n" 估算（多值分别计入）
  const respHeaderBytes = () => {
    let n = 0
    const h = r().headers || {}
    for (const k of Object.keys(h)) {
      const raw = (h as Record<string, string[] | string>)[k]
      const arr = Array.isArray(raw) ? raw : [raw]
      for (const v of arr) n += byteLength(k) + 2 + byteLength(String(v ?? "")) + 2
    }
    return n
  }
  const respBodyBytes = () => r().size || 0
  const reqHeaderBytes = () => {
    let n = 0
    const h = (r().actualRequest?.headers || {}) as Record<string, string>
    for (const k of Object.keys(h)) n += byteLength(k) + 2 + byteLength(String(h[k] ?? "")) + 2
    return n
  }
  const reqBodyBytes = () => byteLength(String(r().actualRequest?.body ?? ""))
  return (
    <div class="w-56 flex flex-col gap-2.5 text-xs">
      <SizeBlock
        icon={<Icon icon="lucide:arrow-down" class="h-3.5 w-3.5 text-blue-500" />}
        label={t("size.responseSize")}
        header={respHeaderBytes()}
        body={respBodyBytes()}
      />
      <div class="border-t border-border" />
      <SizeBlock
        icon={<Icon icon="lucide:arrow-up" class="h-3.5 w-3.5 text-amber-500" />}
        label={t("size.requestSize")}
        header={reqHeaderBytes()}
        body={reqBodyBytes()}
      />
    </div>
  )
}

/** 大小卡片的单个块：标题 + 总计，下分 Header / Body */
function SizeBlock(props: { icon: JSX.Element; label: string; header: number; body: number }) {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center gap-1.5 font-medium text-foreground">{props.icon}{props.label}</span>
        <span class="font-semibold tabular-nums text-foreground">{formatSize(props.header + props.body)}</span>
      </div>
      <div class="flex items-center justify-between pl-5 text-muted-foreground">
        <span>Header</span><span class="tabular-nums">{formatSize(props.header)}</span>
      </div>
      <div class="flex items-center justify-between pl-5 text-muted-foreground">
        <span>Body</span><span class="tabular-nums">{formatSize(props.body)}</span>
      </div>
    </div>
  )
}
