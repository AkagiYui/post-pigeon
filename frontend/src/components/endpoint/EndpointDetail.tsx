// 端点详情组件 - 上中下结构
// 上：请求方法 + URL + 发送/保存/删除按钮
// 中：请求设置 tabs (Params/Body/Headers/Auth/设置)
// 下：响应信息 tabs (Body/Headers/Cookies/实际请求)
import { Icon } from "@iconify-icon/solid"
import { createEffect, createMemo, createSignal, For, type JSX, on, onCleanup, Show } from "solid-js"

import { HTTPService } from "@/../bindings/PostPigeon/internal/services"
import { countBody, countHeaders, countParams, hasEffectiveAuth } from "@/components/endpoint/endpoint-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { HoverCard } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { dragDisplaySize, resolveDragEnd, willCollapse } from "@/components/ui/split-pane-drag"
import { Tabs } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { formatFromContentType } from "@/lib/format"
import { getStatusInfo, statusClass } from "@/lib/http-status"
import { formatSize, formatTiming, getStatusColor, type HTTPMethod, METHOD_COLORS } from "@/lib/types"
import { byteLength, cn, downloadTextFile, extensionForContentType, hasURLScheme } from "@/lib/utils"
import { convertHTTPToWSProtocol, effectiveWSProtocolConversion } from "@/lib/ws-protocol"
import { responseLayout, setResponseLayout, setWebSocketMessageDrafts, webSocketMessageDrafts } from "@/stores/app"
import { markConnecting, streamMessages, streamResponseBodyChunks, streamStatus } from "@/stores/stream"
import { toastError } from "@/stores/toast"

import { AuthEditor } from "./AuthEditor"
import { BodyEditor } from "./BodyEditor"
import { DocumentEditor } from "./DocumentEditor"
import { EndpointSettingsEditor } from "./EndpointSettingsEditor"
import { HeadersEditor } from "./HeadersEditor"
import { OperationsEditor } from "./OperationsEditor"
import { CookiesEditor, ParamsEditor } from "./ParamsEditor"
import { shouldShowResponsePanel } from "./response-visibility"
import { ResponseBodyToolbar, ResponsePanel } from "./ResponsePanel"
import { decodeStreamResponseBodyChunks, streamResponseBody } from "./stream-message-view"
import { StreamEventLog, type StreamPresentationSettings, WebSocketMessageEditor, WebSocketResponse } from "./StreamPanels"

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
const REQUEST_TAB_KEYS = ["message", "params", "body", "headers", "cookies", "auth", "preOperations", "postOperations", "settings"] as const

export type EndpointRequestTabKey = typeof REQUEST_TAB_KEYS[number]

function isEndpointRequestTabKey(value: string): value is EndpointRequestTabKey {
  return (REQUEST_TAB_KEYS as readonly string[]).includes(value)
}

export interface EndpointRequestTabIntent {
  endpointId: string
  tab: EndpointRequestTabKey
  requestId: number
}

/** 带数字徽标的标签标题：count>0 时在标题右侧显示计数气泡 */
export function tabLabelWithCount(label: string, count: number): JSX.Element {
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

/** 响应标签。SSE 是 HTTP 响应的一种呈现方式，因此保留所有常规元数据标签并额外展示时间线。 */
function getResponseTabs(streaming = false) {
  return [
    ...(streaming ? [{ key: "timeline", label: t("stream.messages") }] : []),
    { key: "body", label: t("response.body") },
    { key: "headers", label: t("response.headers") },
    { key: "cookies", label: t("response.cookies") },
    { key: "scripts", label: t("response.scripts") },
    { key: "actualRequest", label: t("response.actualRequest") },
  ]
}

// 数据类型集中在 editor-types，这里再导出一次，保持既有导入路径不变
export * from "@/components/endpoint/editor-types"
import type {
  EndpointData,
  EnvironmentBaseURLOption,
  ResponseData,
  TimingData,
} from "@/components/endpoint/editor-types"

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
  /** 取消进行中请求的回调 */
  onCancelSend?: () => void
  /** 以当前完整请求编辑态建立/关闭 WebSocket 连接 */
  onWSConnect?: (autoConvertProtocol: boolean) => Promise<void>
  onWSDisconnect?: () => Promise<void>
  /** 复制为 cURL 命令的回调 */
  onCopyAsCurl?: () => void
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
  /** 从接口树发起的标签定位请求；requestId 用于重复定位同一接口 */
  requestTabIntent?: EndpointRequestTabIntent
  /** 标签定位请求已处理，供调用方清除一次性意图 */
  onRequestTabIntentHandled?: (requestId: number) => void
}

// 按端点 ID 持久化标签页状态，避免组件重新挂载时丢失
const tabStateStore = new Map<string, { requestTab: string; responseTab: string }>()

/**
 * EnvironmentBadge 环境切换徽章
 * 点击后弹出下拉菜单，展示所有环境的前置 URL，支持快捷切换
 */
function EnvironmentBadge(props: {
  baseUrl: string
  autoConvertWSProtocol?: boolean
  environmentBaseUrls?: EnvironmentBaseURLOption[]
  currentEnvironmentId?: string
  onEnvironmentChange?: (environmentId: string) => void
}) {
  const [open, setOpen] = createSignal(false)
  // 菜单定位（基于 trigger 元素底部左对齐）
  const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 })
  let badgeRef: HTMLSpanElement | undefined
  const displayBaseUrl = (url: string) => convertHTTPToWSProtocol(url, !!props.autoConvertWSProtocol)

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
        title={displayBaseUrl(props.baseUrl) || t("endpoint.baseUrl.notSet")}
      >
        {/* 图标始终显示；标题在空间不足时被挤压隐藏，仅剩图标 */}
        <Icon icon="lucide:link-2" class="h-3 w-3 shrink-0" />
        <span class="truncate min-w-0">{displayBaseUrl(props.baseUrl) || t("endpoint.baseUrl.notSet")}</span>
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
                  <span class="truncate text-sm flex-1 min-w-0">{displayBaseUrl(item.baseUrl) || "/"}</span>
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
  const isWs = () => ep().type === "websocket"

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
        const canRestoreMessageTab = isWs() && saved.requestTab === "message"
        setActiveRequestTab(canRestoreMessageTab || (saved.requestTab !== "message" && isEndpointRequestTabKey(saved.requestTab))
          ? saved.requestTab
          : isWs() ? "message" : "params")
        setActiveResponseTab(saved.responseTab)
      } else {
        setActiveRequestTab(isWs() ? "message" : "params")
        setActiveResponseTab("body")
      }
    },
  ))

  // 接口树的 Option/Alt + 单击可在打开接口后直接定位到设置；同时监听端点 ID，
  // 以覆盖首次加载详情时“意图先到、端点数据后到”的异步时序。
  createEffect(on(
    () => [ep().id, props.requestTabIntent?.requestId] as const,
    () => {
      const intent = props.requestTabIntent
      if (!intent || intent.endpointId !== ep().id) return
      if (intent.tab === "message" && !isWs()) return
      setActiveRequestTab(intent.tab)
      props.onRequestTabIntentHandled?.(intent.requestId)
    },
  ))

  // 前置/后置操作的启用数量（含从模块/文件夹链继承的全局操作，用于 tab 标题数字徽标）
  const preOpsCount = () =>
    ep().operations.filter(o => o.stage === "pre" && o.enabled).length
    + (ep().inheritOperations ? ep().inheritedOperations.filter(item => item.operation.stage === "pre" && item.operation.enabled).length : 0)
  const postOpsCount = () =>
    ep().operations.filter(o => o.stage === "post" && o.enabled).length
    + (ep().inheritOperations ? ep().inheritedOperations.filter(item => item.operation.stage === "post" && item.operation.enabled).length : 0)

  const overrideInheritedOperation = (operationId: string, enabled: boolean | null) => {
    const inherited = ep().inheritedOperations.map(item => {
      if (item.operation.id !== operationId) return item
      return {
        ...item,
        operation: { ...item.operation, enabled: enabled == null ? item.parentEnabled : enabled },
        overridden: enabled != null,
      }
    })
    const without = ep().operationOverrides.filter(item => item.operationId !== operationId)
    props.onChange?.({
      inheritedOperations: inherited,
      operationOverrides: enabled == null ? without : [...without, { operationId, enabled }],
    })
  }

  // 参数 tab 的数字：所有 query 参数 + 路径参数 + 本接口启用的全局参数（见 countParams）
  const paramsCount = () => countParams({
    params: ep().params,
    path: ep().path,
    disabledGlobalParams: ep().disabledGlobalParams,
    globalQueryParams: props.globalQueryParams,
  })
  const bodyCount = () => countBody(ep().bodyType, ep().bodyContent, ep().bodyFields)
  const headersCount = () => countHeaders(ep().headers)

  // 请求设置标签（前置/后置操作作为顶级 tab，位于认证与设置之间）
  const requestTabs = createMemo(() => [
    ...(isWs() ? [{ key: "message", label: t("stream.message") }] : []),
    { key: "params", label: tabLabelWithCount(t("endpoint.params"), paramsCount()) },
    { key: "body", label: tabLabelWithCount(t("endpoint.body"), bodyCount()) },
    { key: "headers", label: tabLabelWithCount(t("endpoint.headers"), headersCount()) },
    { key: "cookies", label: t("endpoint.cookies") },
    { key: "auth", label: tabLabelWithCount(t("endpoint.auth"), hasEffectiveAuth(ep().auth, ep().hasInheritedAuth) ? 1 : 0) },
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

  // SSE 到达后默认切换到 Timeline，但用户仍可返回常规 HTTP 响应标签检查 Header、Cookie 和实际请求。
  createEffect(on(() => props.response?.streamId, (streamId) => {
    if (streamId) setActiveResponseTab("timeline")
  }))

  // 流式响应不会在 SendRequest 返回时一次性携带 Body。优先使用后端逐 chunk 保留的原始字节（与
  // Apifox 的 response.stream 相同）；旧会话或未收到字节时再从 Timeline 记录降级重组。
  const responseForDisplay = createMemo(() => {
    const response = props.response
    if (!response?.streaming || !response.streamId) return response
    const chunks = streamResponseBodyChunks(response.streamId)
    const body = decodeStreamResponseBodyChunks(chunks) || streamResponseBody(streamMessages(response.streamId), response.streamFormat)
    return { ...response, body, size: byteLength(body) }
  })

  // ---- 响应区尺寸调整 / 收起（上下布局调高度，左右布局调宽度） ----
  const MIN_RESPONSE_H = 140 // 上下布局最低高度
  const MIN_RESPONSE_W = 280 // 左右布局最低宽度
  const COLLAPSE_DRAG = 48 // 拖到最低尺寸后再往下/右拖这么多，松手即收起
  const [responseHeight, setResponseHeight] = createSignal(300)
  const [responseWidth, setResponseWidth] = createSignal(480)
  const [responseCollapsed, setResponseCollapsed] = createSignal(false)
  // 拖拽已越过「松手即收起」的距离，用来提前给出视觉预告
  const [responseCollapseArmed, setResponseCollapseArmed] = createSignal(false)
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
    const max = Math.max(min, extent - 180)
    // raw 是不受最小尺寸约束的「意图尺寸」：面板停在最小尺寸不动，但仍要知道
    // 拖过头多少，才能在松手时判断是弹回还是收起（与侧栏同一套手感）
    let raw = startSize

    const onMove = (ev: MouseEvent) => {
      const cur = horizontal ? ev.clientX : ev.clientY
      raw = startSize + (start - cur) // 手柄向左/上移动增大响应区
      setSize(dragDisplaySize(raw, min, max))
      setResponseCollapseArmed(willCollapse(raw, min, COLLAPSE_DRAG))
    }

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", cleanup)
      document.body.classList.remove("dragging")
      setResponseCollapseArmed(false)

      const outcome = resolveDragEnd(raw, min, max, COLLAPSE_DRAG)
      setSize(outcome.size)
      if (outcome.collapsed) setResponseCollapsed(true)
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

  /**
   * 保存响应体到文件。
   * 有原始字节时按原始字节写出（图片 / PDF / 压缩包等二进制响应才不会被破坏），
   * 否则退回已解码的文本。
   */
  const downloadResponseBody = () => {
    const response = responseForDisplay()
    if (!response) return
    const contentType = (response.contentType || "").split(";")[0].trim() || "application/octet-stream"
    const fileName = `response${extensionForContentType(contentType)}`

    if (response.rawBody) {
      const binary = atob(response.rawBody)
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: contentType }))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
      return
    }
    downloadTextFile(fileName, response.body || "", contentType)
  }


  // ---- WebSocket：连接/断开由顶部请求行的按钮驱动，连接存活于 Go 侧 ----
  const autoConvertWSProtocol = () => isWs() && effectiveWSProtocolConversion(
    ep().wsProtocolConversion,
    ep().inheritedWsProtocolConversion,
  )
  const wsStatus = () => streamStatus(ep().id)
  const wsConnect = async () => {
    markConnecting(ep().id)
    try {
      await props.onWSConnect?.(autoConvertWSProtocol())
    } catch (e) { toastError(e, "error.op.connectFailed") }
  }
  const wsDisconnect = async () => { try { await props.onWSDisconnect?.() } catch (e) { toastError(e) } }
  // 停止流式响应（响应体为 text/event-stream 的流式 HTTP 响应）
  const stopStream = async () => {
    const id = props.response?.streamId
    if (!id) return
    try { await HTTPService.StopStream(id) } catch (e) { toastError(e) }
  }
  const updateStreamPresentation = (settings: Partial<StreamPresentationSettings>) => {
    const update: Partial<EndpointData> = {}
    if (settings.viewMode !== undefined) update.streamViewMode = settings.viewMode
    if (settings.completionFormat !== undefined) update.streamCompletionFormat = settings.completionFormat
    if (settings.jsonPath !== undefined) update.streamJSONPath = settings.jsonPath
    if (settings.renderMarkdown !== undefined) update.streamRenderMarkdown = settings.renderMarkdown
    props.onChange?.(update)
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
                autoConvertWSProtocol={autoConvertWSProtocol()}
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
            // 发送中时按钮切换为「取消」：此前长超时请求点下去只能干等
            <Show
              when={!props.sending}
              fallback={
                <Button size="sm" variant="outline" onClick={props.onCancelSend}>
                  <Icon icon="lucide:square" class="h-3.5 w-3.5" />
                  {t("endpoint.cancelSend")}
                </Button>
              }
            >
              <Tooltip content="Ctrl+Enter">
                <Button size="sm" onClick={props.onSend}>
                  <Icon icon="lucide:send" class="h-3.5 w-3.5" />
                  {t("endpoint.send")}
                </Button>
              </Tooltip>
            </Show>
          }>
            <Show when={wsStatus() === "open"} fallback={
              <Button size="sm" onClick={wsConnect}><Icon icon="lucide:plug-zap" class="h-3.5 w-3.5" />{t("stream.connect")}</Button>
            }>
              <Button size="sm" variant="outline" onClick={wsDisconnect}><Icon icon="lucide:plug" class="h-3.5 w-3.5" />{t("stream.disconnect")}</Button>
            </Show>
          </Show>
          {/* 复制为 cURL：把当前请求（含已解析的变量）贴进工单、文档或 CI 的最短路径 */}
          <Show when={!isWs()}>
            <Tooltip content={t("curl.copy")}>
              <Button variant="ghost" size="icon-sm" onClick={props.onCopyAsCurl} aria-label={t("curl.copy")}>
                <Icon icon="lucide:terminal" class="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
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
              variant="line"
              tabs={requestTabs()}
              value={activeRequestTab()}
              onChange={setActiveRequestTab}
            >
              {(key) => {
                switch (key) {
                  case "message": return <WebSocketMessageEditor
                    connId={ep().id}
                    value={webSocketMessageDrafts()[ep().id] ?? ""}
                    onChange={(value) => setWebSocketMessageDrafts(drafts => ({ ...drafts, [ep().id]: value }))}
                  />
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
                  case "headers": return <HeadersEditor
                    value={ep().headers}
                    bodyType={ep().bodyType}
                    contentType={ep().contentType}
                    onChange={(v) => props.onChange?.({ headers: v })}
                  />
                  case "auth": return <AuthEditor value={ep().auth} onChange={(v) => props.onChange?.({ auth: v })} />
                  case "preOperations": return <OperationsEditor
                    stage="pre"
                    operations={ep().operations}
                    inheritedOperations={ep().inheritedOperations}
                    inheritEnabled={ep().inheritOperations}
                    onInheritEnabledChange={(enabled) => props.onChange?.({ inheritOperations: enabled })}
                    onInheritedOverride={overrideInheritedOperation}
                    operationResults={props.response?.scripts?.operationResults || []}
                    onChange={(ops) => props.onChange?.({ operations: ops })}
                    projectId={props.projectId}
                  />
                  case "postOperations": return <OperationsEditor
                    stage="post"
                    operations={ep().operations}
                    inheritedOperations={ep().inheritedOperations}
                    inheritEnabled={ep().inheritOperations}
                    onInheritEnabledChange={(enabled) => props.onChange?.({ inheritOperations: enabled })}
                    onInheritedOverride={overrideInheritedOperation}
                    operationResults={props.response?.scripts?.operationResults || []}
                    onChange={(ops) => props.onChange?.({ operations: ops })}
                    projectId={props.projectId}
                  />
                  case "settings": return <EndpointSettingsEditor
                    endpointType={ep().type}
                    timeout={ep().timeout}
                    timeoutMode={ep().timeoutMode}
                    followRedirects={ep().followRedirects}
                    sendNoCacheHeaders={ep().sendNoCacheHeaders}
                    status={ep().status}
                    tags={ep().tags}
                    description={ep().description}
                    proxyConfig={ep().proxyConfig}
                    tlsConfig={ep().tlsConfig}
                    urlEncoding={ep().urlEncoding}
                    wsProtocolConversion={ep().wsProtocolConversion}
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
                {/* 收起不该把结果一起藏掉：状态码、耗时、大小留在手柄上，
                    要看正文再展开 */}
                <Show when={props.response && responseLayout() === "bottom"}>
                  <span class="ml-2 flex items-center gap-2">
                    <Badge class={getStatusColor(props.response!.statusCode)}>
                      {props.response!.statusCode}
                    </Badge>
                    <span class="tabular-nums">{formatTiming(props.response!.timing?.total || 0)}</span>
                    <span class="tabular-nums">{formatSize(props.response!.size || 0)}</span>
                  </span>
                </Show>
              </button>
            }
          >
            {/* 拖拽手柄：上下布局调高度、左右布局调宽度，拖到最低再继续拖即收起 */}
            <div
              class={cn(
                "shrink-0 bg-border hover:bg-accent/40 relative group",
                responseLayout() === "right" ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
                responseCollapseArmed() && "bg-accent",
              )}
              onMouseDown={startResponseResize}
            >
              <div class={cn("absolute z-10", responseLayout() === "right" ? "inset-y-0 -left-1.5 -right-1.5" : "inset-x-0 -top-1.5 -bottom-1.5")} />
              <div class={cn(
                "absolute rounded-full bg-border group-hover:bg-accent/60 transition-colors",
                responseLayout() === "right" ? "top-1/2 -translate-y-1/2 -left-[3px] w-[6px] h-8" : "left-1/2 -translate-x-1/2 -top-[3px] h-[6px] w-8",
              )} />
            </div>
            <div
              class={cn(
                "shrink-0 overflow-hidden",
                // 松手就会收起时先淡出，给一个「再拖就没了」的预告
                responseCollapseArmed() && "opacity-50 transition-opacity",
              )}
              style={responseLayout() === "right" ? { width: `${responseWidth()}px` } : { height: `${responseHeight()}px` }}
            >
              <Show
                when={props.response}
                fallback={
                  <Show
                    when={shouldShowResponsePanel(false, isWs(), wsStatus())}
                    fallback={
                      <div class="relative h-full">
                        <div class="absolute top-1.5 right-2 z-10"><LayoutToggle /></div>
                        <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
                          {t("endpoint.sendToViewResponse")}
                        </div>
                      </div>
                    }
                  >
                    {/* WebSocket 连接和消息由全局 stream store 持有。切换接口后即使握手响应没有恢复，
                      也要直接恢复消息面板，不能退回“未请求”占位。 */}
                    <div class="flex flex-col h-full">
                      <div class="flex justify-end px-2 py-1 border-b border-border shrink-0">
                        <LayoutToggle />
                      </div>
                      <div class="flex-1 min-h-0">
                        <WebSocketResponse connId={ep().id} layout={responseLayout()} />
                      </div>
                    </div>
                  </Show>
                }
              >
                {/* 失败也保留完整标签页：错误正文和实际请求 attempt 链需要同时可检查。 */}
                <Tabs
                  variant="line"
                  tabs={getResponseTabs(!isWs() && !!props.response!.streaming)}
                  value={activeResponseTab()}
                  onChange={setActiveResponseTab}
                  extra={
                    <div class="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* 上下布局：响应体工具栏移到状态码左侧，避免单独占一行（左右布局时工具栏留在面板内） */}
                      <Show when={!isWs() && responseLayout() === "bottom" && activeResponseTab() === "body"}>
                        <ResponseBodyToolbar
                          renderMode={renderMode()}
                          onRenderModeChange={setRenderMode}
                          format={format()}
                          onFormatChange={setFormat}
                          encoding={encoding()}
                          onEncodingChange={setEncoding}
                          encodingDisabled={props.response?.rawBodyOmitted}
                          onDownload={downloadResponseBody}
                        />
                      </Show>
                      {/* 状态码：hover 展示该状态码的名称与释义 */}
                      <Show
                        when={!props.response!.error}
                        fallback={<Badge class="bg-red-500/15 text-red-600 dark:text-red-400">{t("response.failed")}</Badge>}
                      >
                        <HoverCard content={<ResponseStatusCard code={props.response!.statusCode} />}>
                          <Badge class={cn(getStatusColor(props.response!.statusCode), "cursor-help")}>
                            {props.response!.statusCode}
                          </Badge>
                        </HoverCard>
                      </Show>
                      {/* 耗时：hover 展示各阶段耗时 */}
                      <HoverCard content={<ResponseTimingCard timing={props.response!.timing} />}>
                        <span class="cursor-help border-b border-dotted border-muted-foreground/40 hover:text-foreground transition-colors">
                          {formatTiming(props.response!.timing?.total || 0)}
                        </span>
                      </HoverCard>
                      {/* 大小：hover 展示请求/响应的头与体大小 */}
                      <HoverCard content={<ResponseSizeCard response={responseForDisplay()!} />}>
                        <span class="cursor-help border-b border-dotted border-muted-foreground/40 hover:text-foreground transition-colors">
                          {formatSize(responseForDisplay()!.size || 0)}
                        </span>
                      </HoverCard>
                      {/* 布局切换按钮（上下 / 左右） */}
                      <LayoutToggle />
                    </div>
                  }
                >
                  {(key) => (
                    <Show when={!isWs() && key === "timeline"} fallback={
                      <Show when={isWs() && key === "body"} fallback={
                        <ResponsePanel
                          tab={key}
                          response={responseForDisplay()!}
                          renderMode={renderMode()}
                          format={format()}
                          encoding={encoding()}
                          showToolbar={responseLayout() === "right"}
                          onRenderModeChange={setRenderMode}
                          onFormatChange={setFormat}
                          onEncodingChange={setEncoding}
                          onDownload={downloadResponseBody}
                        />
                      }>
                        <WebSocketResponse connId={ep().id} layout={responseLayout()} />
                      </Show>
                    }>
                      <StreamEventLog
                        streamId={props.response!.streamId!}
                        streamFormat={props.response!.streamFormat}
                        onStop={stopStream}
                        settings={{
                          viewMode: ep().streamViewMode,
                          completionFormat: ep().streamCompletionFormat,
                          jsonPath: ep().streamJSONPath,
                          renderMarkdown: ep().streamRenderMarkdown,
                        }}
                        onSettingsChange={updateStreamPresentation}
                      />
                    </Show>
                  )}
                </Tabs>
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
    const run = r().requestRun
    const selected = run?.attempts.find((attempt) => attempt.id === run.selectedAttemptId) || run?.attempts.at(-1)
    if (selected) {
      return selected.request.headers.reduce((total, header) => total + byteLength(header.name) + 2 + byteLength(header.value) + 2, 0)
    }
    let n = 0
    const h = (r().actualRequest?.headers || {}) as Record<string, string>
    for (const k of Object.keys(h)) n += byteLength(k) + 2 + byteLength(String(h[k] ?? "")) + 2
    return n
  }
  const reqBodyBytes = () => {
    const run = r().requestRun
    const selected = run?.attempts.find((attempt) => attempt.id === run.selectedAttemptId) || run?.attempts.at(-1)
    return selected ? selected.request.body.size : byteLength(String(r().actualRequest?.body ?? ""))
  }
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
