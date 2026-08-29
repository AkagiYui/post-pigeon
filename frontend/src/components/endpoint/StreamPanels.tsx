// 流式视图组件：WebSocket 消息流 + HTTP 流式响应（text/event-stream）。连接由 Go 侧维护，切换标签页不会断开。
// WebSocket 端点复用普通接口详情页布局：连接按钮在顶部请求行，响应区为消息流。
// 普通接口收到 text/event-stream 响应时，响应区展示实时事件流（SSE 只是流式响应的一种文本规范）。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"

import { WebSocketService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CodeEditor, type CodeLanguage } from "@/components/ui/code-editor"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { formatBody, parseJSONForDisplay } from "@/lib/format"
import { cn, downloadTextFile } from "@/lib/utils"
import {
  clearWebSocketMessageAfterSend,
  formatWebSocketJSON,
  parseWebSocketJSON,
  setClearWebSocketMessageAfterSend,
  setFormatWebSocketJSON,
  setParseWebSocketJSON,
} from "@/stores/app"
import {
  clearStreamMessages,
  selectedStreamMessage,
  selectStreamMessage,
  type StreamMessage,
  streamMessages,
  streamStatus,
} from "@/stores/stream"
import { toastError } from "@/stores/toast"

import {
  filterAndSortStreamMessages,
  inferMessageFormat,
  latestMessageScrollTop,
  mergeStreamRecords,
  messageContentForDisplay,
  type StreamMessageDirection,
  type StreamMessageOrder,
  type StreamViewMode,
} from "./stream-message-view"

export function StatusDot(props: { status: string }) {
  const color = () => ({
    open: "bg-green-500", connecting: "bg-amber-500", error: "bg-red-500", closed: "bg-gray-400", idle: "bg-gray-400",
  }[props.status] || "bg-gray-400")
  return <span class={cn("inline-block h-2 w-2 rounded-full", color())} />
}

/** 消息流日志（按 connId 从全局 store 读取，切换标签页不丢失） */
export function MessageLog(props: {
  connId: string
  /** 传入时用于合并视图；未传入时从全局流 store 读取。 */
  sourceMessages?: StreamMessage[]
  parseJSON?: boolean
  formatJSON?: boolean
  query?: string
  direction?: StreamMessageDirection
  order?: StreamMessageOrder
  showTimestamp?: boolean
  /** SSE 时间线额外展示 event/id/retry/comment 协议字段。 */
  showSSEMetadata?: boolean
  raw?: boolean
  selectedMessage?: StreamMessage
  onMessageSelect?: (message: StreamMessage) => void
  containerRef?: (element: HTMLDivElement) => void
  onScroll?: () => void
}) {
  const allMessages = createMemo(() => props.sourceMessages ?? streamMessages(props.connId))
  const messages = createMemo(() => filterAndSortStreamMessages(
    allMessages(),
    props.query ?? "",
    props.direction ?? "all",
    props.order ?? "asc",
  ))
  const displayData = (data: string, binary?: boolean) =>
    props.parseJSON && !binary ? parseJSONForDisplay(data, props.formatJSON ?? false) : data
  const noResults = () => allMessages().length > 0 && messages().length === 0
  return (
    <div
      ref={(element) => props.containerRef?.(element)}
      onScroll={() => props.onScroll?.()}
      class="flex-1 min-h-0 overflow-auto rounded-md border border-border bg-input p-2 flex flex-col gap-1"
    >
      <For
        each={messages()}
        fallback={<div class="text-xs text-muted-foreground text-center py-4">{t(noResults() ? "stream.noMatchingMessages" : "stream.noMessages")}</div>}
      >
        {(m) => (
          <div
            class={cn(
              "flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-xs font-mono transition-colors",
              props.onMessageSelect && "cursor-pointer hover:bg-muted",
              props.selectedMessage === m && "bg-accent-muted text-foreground",
            )}
            // 对数千条历史消息，浏览器只布局和绘制进入视口的行；保留 DOM 顺序以维持
            // 搜索、键盘操作和自动跟随的既有语义。
            style={{ "content-visibility": "auto", "contain-intrinsic-size": "34px" }}
            role={props.onMessageSelect ? "button" : undefined}
            tabIndex={props.onMessageSelect ? 0 : undefined}
            aria-pressed={props.onMessageSelect ? props.selectedMessage === m : undefined}
            onClick={() => props.onMessageSelect?.(m)}
            onKeyDown={(event) => {
              if (!props.onMessageSelect || (event.key !== "Enter" && event.key !== " ")) return
              event.preventDefault()
              props.onMessageSelect(m)
            }}
          >
            <span class={cn(
              "shrink-0 px-1 rounded text-[10px]",
              m.kind === "sent" ? "bg-blue-500/15 text-blue-500"
                : m.kind === "message" ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : m.kind === "error" ? "bg-red-500/15 text-red-500"
                    : "bg-muted text-muted-foreground",
            )}>{m.kind === "sent" ? "↑" : m.kind === "message" ? "↓" : m.kind}</span>
            <Show when={props.showTimestamp}>
              <span
                class="shrink-0 text-[10px] leading-5 tabular-nums text-muted-foreground"
                title={new Date(m.timestamp).toLocaleString()}
              >
                {new Date(m.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
            </Show>
            <div class="min-w-0 flex-1">
              <Show when={props.showSSEMetadata && (m.event || m.hasEventId || m.hasRetry)}>
                <div class="mb-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <Show when={m.event}><span class="rounded bg-muted px-1">event: {m.event}</span></Show>
                  <Show when={m.hasEventId}><span class="rounded bg-muted px-1">id: {m.eventId ?? ""}</span></Show>
                  <Show when={m.hasRetry}><span class="rounded bg-muted px-1">retry: {m.retry}ms</span></Show>
                </div>
              </Show>
              <Show when={m.hasCloseCode}>
                <div class="mb-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span class="rounded bg-muted px-1">{t("stream.closeCode")}: {m.closeCode}</span>
                  <Show when={m.closeReason}><span class="rounded bg-muted px-1">{t("stream.closeReason")}: {m.closeReason}</span></Show>
                </div>
              </Show>
              <span class="break-all whitespace-pre-wrap text-foreground">
                {props.raw ? (m.raw ?? m.data) : m.hasComment ? `: ${m.comment ?? ""}` : displayData(m.data, m.binary)}
              </span>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

const messageFormatOptions = [
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
]

const messageEncodingOptions = [
  { value: "utf-8", label: "UTF-8" },
  { value: "gbk", label: "GBK" },
  { value: "gb2312", label: "GB2312" },
  { value: "iso-8859-1", label: "ISO-8859-1" },
]

/** 选中一条 WebSocket 消息后展开的详情面板。 */
function StreamMessageDetail(props: {
  message: StreamMessage
  layout: "right" | "bottom"
  onClose: () => void
}) {
  const [renderMode, setRenderMode] = createSignal<"pretty" | "raw" | "preview">("pretty")
  const [format, setFormat] = createSignal<"json" | "xml" | "html">(inferMessageFormat(props.message))
  const [encoding, setEncoding] = createSignal("utf-8")

  const decodedContent = createMemo(() => messageContentForDisplay(props.message, encoding()))
  const displayContent = createMemo(() => renderMode() === "pretty"
    ? formatBody(decodedContent(), format())
    : decodedContent())
  const language = (): CodeLanguage => {
    if (renderMode() === "raw") return "text"
    if (format() === "xml") return "xml"
    if (format() === "html") return "html"
    return "json"
  }

  return (
    <section
      class={cn(
        "flex flex-1 flex-col overflow-hidden rounded-md border border-border bg-input",
        props.layout === "right" ? "min-h-48" : "min-w-72",
      )}
      aria-label={t("stream.messageDetail")}
    >
      <div class="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-foreground">{t("stream.messageContent")}</p>
          <p class="text-[10px] text-muted-foreground">
            {props.message.binary ? t("stream.binaryMessage") : props.message.hasComment ? t("stream.sseComment") : t("stream.textMessage")}
            {" · "}{new Date(props.message.timestamp).toLocaleTimeString([], { hour12: false })}
          </p>
          <Show when={props.message.hasCloseCode}>
            <p class="text-[10px] text-muted-foreground">{t("stream.closeCode")}: {props.message.closeCode}{props.message.closeReason ? ` · ${t("stream.closeReason")}: ${props.message.closeReason}` : ""}</p>
          </Show>
        </div>
        <div class="flex items-center gap-1">
          <Show when={renderMode() !== "preview"}>
            <Select
              options={messageEncodingOptions}
              value={encoding()}
              onChange={setEncoding}
              size="sm"
              class="w-24"
              aria-label={t("stream.messageEncoding")}
            />
          </Show>
          <Show when={renderMode() === "pretty"}>
            <Select
              options={messageFormatOptions}
              value={format()}
              onChange={(value) => setFormat(value as "json" | "xml" | "html")}
              size="sm"
              class="w-20"
              aria-label={t("stream.messageFormat")}
            />
          </Show>
          <div class="flex items-center overflow-hidden rounded-md border border-border" aria-label={t("stream.messageRenderMode")}>
            <For each={[
              { value: "pretty", label: () => t("response.pretty") },
              { value: "raw", label: () => t("response.raw") },
              { value: "preview", label: () => t("response.preview") },
            ] as const}>
              {(mode) => (
                <button
                  type="button"
                  class={cn(
                    "px-2 py-1 text-xs font-medium transition-colors",
                    renderMode() === mode.value
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-pressed={renderMode() === mode.value}
                  onClick={() => setRenderMode(mode.value)}
                >
                  {mode.label()}
                </button>
              )}
            </For>
          </div>
          <Button size="icon-sm" variant="ghost" aria-label={t("stream.closeMessageDetail")} onClick={props.onClose}>
            <Icon icon="lucide:x" class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <Show
          when={renderMode() === "preview"}
          fallback={<CodeEditor value={displayContent()} language={language()} readOnly class="h-full rounded-none border-0 bg-transparent" />}
        >
          <Show
            when={decodedContent()}
            fallback={<div class="p-3 text-sm text-muted-foreground">{t("stream.noMessageContent")}</div>}
          >
            <iframe
              class="h-full w-full border-0 bg-white"
              srcdoc={decodedContent()}
              sandbox=""
              referrerpolicy="no-referrer"
              title={t("response.preview")}
            />
          </Show>
        </Show>
      </div>
    </section>
  )
}

/** WebSocket 消息编辑器：位于请求编辑区的首个“消息”标签页。 */
export function WebSocketMessageEditor(props: {
  connId: string
  value: string
  onChange: (value: string) => void
}) {
  const status = createMemo(() => streamStatus(props.connId))
  const [payloadType, setPayloadType] = createSignal<"text" | "base64" | "hex">("text")

  const send = async () => {
    if (!props.value.trim()) return
    try {
      const type = payloadType()
      if (type === "text") {
        await WebSocketService.Send(props.connId, props.value)
      } else {
        await WebSocketService.SendBinary(props.connId, encodeWebSocketBinary(props.value, type))
      }
      if (clearWebSocketMessageAfterSend()) props.onChange("")
    } catch (e) { toastError(e, "error.op.sendFailed") }
  }

  return (
    <div class="flex h-full flex-col gap-3 overflow-auto p-3">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{status() === "open" ? t("stream.readyToSend") : t("stream.connectToSend")}</span>
        <span class="flex-1" />
        <label class="flex cursor-pointer select-none items-center gap-1.5">
          <Checkbox
            checked={clearWebSocketMessageAfterSend()}
            onChange={(event) => setClearWebSocketMessageAfterSend(event.currentTarget.checked)}
          />
          <span>{t("stream.clearAfterSend")}</span>
        </label>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t("stream.payloadType")}</span>
        <Select
          size="sm"
          value={payloadType()}
          onChange={(value) => setPayloadType(value as "text" | "base64" | "hex")}
          options={[
            { value: "text", label: t("stream.payloadText") },
            { value: "base64", label: "Base64" },
            { value: "hex", label: "Hex" },
          ]}
          class="w-28"
        />
      </div>
      <Textarea
        value={props.value}
        onInput={(event) => props.onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            void send()
          }
        }}
        placeholder={payloadType() === "text" ? t("stream.messagePlaceholder") : t("stream.binaryPayloadPlaceholder")}
        aria-label={payloadType() === "text" ? t("stream.messagePlaceholder") : t("stream.binaryPayloadPlaceholder")}
        spellcheck={false}
        class="min-h-32 flex-1 resize-y font-mono text-xs"
      />
      <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("stream.sendShortcut")}</span>
        <Button size="sm" onClick={() => void send()} disabled={status() !== "open" || !props.value.trim()}>
          <Icon icon="lucide:send" class="h-3.5 w-3.5" />
          {t("stream.send")}
        </Button>
      </div>
    </div>
  )
}

/** 将编辑器中的二进制表示规范成后端 SendBinary 所需的 Base64。 */
export function encodeWebSocketBinary(value: string, type: "base64" | "hex"): string {
  if (type === "base64") {
    // 先在浏览器侧校验，错误能在原位置反馈；后端仍会二次校验。
    try { atob(value.replace(/\s/g, "")) } catch { throw new Error(t("stream.invalidBase64")) }
    return value.replace(/\s/g, "")
  }
  const compact = value.replace(/\s/g, "")
  if (!compact || compact.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(compact)) {
    throw new Error(t("stream.invalidHex"))
  }
  let bytes = ""
  for (let index = 0; index < compact.length; index += 2) bytes += String.fromCharCode(Number.parseInt(compact.slice(index, index + 2), 16))
  return btoa(bytes)
}

/** WebSocket 响应区：消息流（连接按钮在顶部请求行，发送框在请求编辑区） */
export function WebSocketResponse(props: { connId: string; layout?: "right" | "bottom" }) {
  const [query, setQuery] = createSignal("")
  const [direction, setDirection] = createSignal<StreamMessageDirection>("all")
  const [order, setOrder] = createSignal<StreamMessageOrder>("asc")
  const [followLatest, setFollowLatest] = createSignal(true)
  const [selectedMessage, setSelectedMessage] = createSignal<StreamMessage | undefined>(selectedStreamMessage(props.connId))
  const status = createMemo(() => streamStatus(props.connId))
  const messageCount = createMemo(() => streamMessages(props.connId).length)
  let messageLogElement: HTMLDivElement | undefined
  let scrollFrame: number | undefined
  let releaseScrollFrame: number | undefined
  let autoScrolling = false

  // 详情选择由 stream store 按连接保存，切换接口或响应 Tab 后重新挂载时能恢复。
  createEffect(() => {
    setSelectedMessage(selectedStreamMessage(props.connId))
  })

  // 消息数量、排序方向或开关变化后，在下一帧等 DOM 列表完成更新，再定位到最新消息。
  createEffect(() => {
    const count = messageCount()
    const currentOrder = order()
    const shouldFollow = followLatest()
    if (!shouldFollow || !messageLogElement) return

    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = undefined
      const element = messageLogElement
      if (!element || !followLatest() || messageCount() !== count) return

      autoScrolling = true
      element.scrollTop = latestMessageScrollTop(currentOrder, element.scrollHeight, element.clientHeight)
      if (releaseScrollFrame !== undefined) cancelAnimationFrame(releaseScrollFrame)
      // scroll 事件可能在赋值后的下一帧才派发；保护到下一帧，避免把自动跟随误判为主动滚动。
      releaseScrollFrame = requestAnimationFrame(() => {
        autoScrolling = false
        releaseScrollFrame = undefined
      })
    })
  })

  onCleanup(() => {
    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
    if (releaseScrollFrame !== undefined) cancelAnimationFrame(releaseScrollFrame)
  })

  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{t("stream.messages")}</span>
        <Show when={messageCount() > 0}>
          <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{messageCount()}</span>
        </Show>
        <span class="flex-1" />
        <label class="flex items-center gap-1.5 cursor-pointer select-none">
          <Checkbox
            checked={parseWebSocketJSON()}
            onChange={(e) => setParseWebSocketJSON(e.currentTarget.checked)}
          />
          <span>{t("stream.parseJSON")}</span>
        </label>
        <label class={cn("flex items-center gap-1.5 select-none", parseWebSocketJSON() ? "cursor-pointer" : "cursor-not-allowed opacity-50")}>
          <Checkbox
            checked={formatWebSocketJSON()}
            disabled={!parseWebSocketJSON()}
            onChange={(e) => setFormatWebSocketJSON(e.currentTarget.checked)}
          />
          <span>{t("stream.formatJSON")}</span>
        </label>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="relative min-w-24 max-w-52 flex-1">
          <Icon icon="lucide:search" class="pointer-events-none absolute left-2 top-1/2 z-1 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            size="sm"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            placeholder={t("stream.filterPlaceholder")}
            aria-label={t("stream.filterPlaceholder")}
            class="pl-7"
          />
        </div>
        <Select
          size="sm"
          value={direction()}
          onChange={(value) => setDirection(value as StreamMessageDirection)}
          options={[
            { value: "all", label: t("stream.direction.all") },
            { value: "sent", label: t("stream.direction.sent") },
            { value: "received", label: t("stream.direction.received") },
          ]}
          class="w-24 shrink-0"
        />
        <Tooltip content={t(order() === "asc" ? "stream.order.oldestFirst" : "stream.order.newestFirst")}>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t(order() === "asc" ? "stream.order.oldestFirst" : "stream.order.newestFirst")}
            onClick={() => setOrder(value => value === "asc" ? "desc" : "asc")}
          >
            <Icon icon={order() === "asc" ? "lucide:arrow-down" : "lucide:arrow-up"} class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <label class="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={followLatest()}
            onChange={(event) => setFollowLatest(event.currentTarget.checked)}
          />
          <span>{t("stream.followLatest")}</span>
        </label>
        <span class="flex-1" />
        <Tooltip content={t("stream.clearMessages")}>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("stream.clearMessages")}
            onClick={() => clearStreamMessages(props.connId)}
          >
            <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
      <div class={cn("flex min-h-0 flex-1 gap-2", props.layout === "right" ? "flex-col" : "flex-row")}>
        <MessageLog
          connId={props.connId}
          parseJSON={parseWebSocketJSON()}
          formatJSON={formatWebSocketJSON()}
          query={query()}
          direction={direction()}
          order={order()}
          showTimestamp
          selectedMessage={selectedMessage()}
          onMessageSelect={(message) => {
            setSelectedMessage(message)
            selectStreamMessage(props.connId, message)
          }}
          containerRef={(element) => { messageLogElement = element }}
          onScroll={() => {
            if (followLatest() && !autoScrolling) setFollowLatest(false)
          }}
        />
        <Show when={selectedMessage()} keyed>
          {(message) => (
            <StreamMessageDetail
              message={message}
              layout={props.layout ?? "right"}
              onClose={() => selectStreamMessage(props.connId)}
            />
          )}
        </Show>
      </div>
    </div>
  )
}

/** 流式响应区：实时事件流 + 停止按钮（用于响应体为 text/event-stream 的流式 HTTP 响应） */
export function StreamEventLog(props: { streamId: string; streamFormat?: string; onStop?: () => void }) {
  const status = createMemo(() => streamStatus(props.streamId))
  const [query, setQuery] = createSignal("")
  const [order, setOrder] = createSignal<StreamMessageOrder>("asc")
  const [followLatest, setFollowLatest] = createSignal(true)
  const [selectedMessage, setSelectedMessage] = createSignal<StreamMessage | undefined>(selectedStreamMessage(props.streamId))
  const [raw, setRaw] = createSignal(false)
  const [viewMode, setViewMode] = createSignal<StreamViewMode>("timeline")
  const messageCount = createMemo(() => streamMessages(props.streamId).length)
  const completionMessages = createMemo(() => {
    const merged = mergeStreamRecords(streamMessages(props.streamId), props.streamFormat)
    return merged ? [merged] : []
  })
  let messageLogElement: HTMLDivElement | undefined
  let scrollFrame: number | undefined
  let releaseScrollFrame: number | undefined
  let autoScrolling = false

  createEffect(() => setSelectedMessage(selectedStreamMessage(props.streamId)))
  createEffect(() => {
    const count = messageCount()
    const currentOrder = order()
    if (!followLatest() || !messageLogElement) return
    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = undefined
      const element = messageLogElement
      if (!element || !followLatest() || messageCount() !== count) return
      autoScrolling = true
      element.scrollTop = latestMessageScrollTop(currentOrder, element.scrollHeight, element.clientHeight)
      if (releaseScrollFrame !== undefined) cancelAnimationFrame(releaseScrollFrame)
      releaseScrollFrame = requestAnimationFrame(() => { autoScrolling = false; releaseScrollFrame = undefined })
    })
  })
  onCleanup(() => {
    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
    if (releaseScrollFrame !== undefined) cancelAnimationFrame(releaseScrollFrame)
  })
  const exportTranscript = () => {
    const content = streamMessages(props.streamId)
      .map((message) => message.raw ?? (message.hasComment ? `: ${message.comment ?? ""}` : message.data))
      .join("\n\n")
    downloadTextFile(`stream-${props.streamFormat || "events"}.txt`, content, "text/plain")
  }

  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{status() === "open" ? t("stream.streaming") : t("stream.streamEnded")}</span>
        <Show when={props.streamFormat}><span class="rounded bg-muted px-1 text-[10px] uppercase">{props.streamFormat}</span></Show>
        <Show when={messageCount() > 0}>
          <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{messageCount()}</span>
        </Show>
        <Tooltip content={t("stream.exportTranscript")}>
          <Button size="icon-sm" variant="ghost" onClick={exportTranscript} disabled={messageCount() === 0}>
            <Icon icon="lucide:download" class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <span class="flex-1" />
        <Show when={status() === "open"}>
          <Button size="sm" variant="outline" onClick={props.onStop}><Icon icon="lucide:circle-stop" class="h-3.5 w-3.5" />{t("stream.stop")}</Button>
        </Show>
        <Button size="icon-sm" variant="ghost" onClick={() => clearStreamMessages(props.streamId)}><Icon icon="lucide:trash-2" class="h-3.5 w-3.5" /></Button>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="relative min-w-24 max-w-52 flex-1">
          <Icon icon="lucide:search" class="pointer-events-none absolute left-2 top-1/2 z-1 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            size="sm"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("stream.filterPlaceholder")}
            aria-label={t("stream.filterPlaceholder")}
            class="pl-7"
          />
        </div>
        <Tooltip content={t(order() === "asc" ? "stream.order.oldestFirst" : "stream.order.newestFirst")}>
          <Button size="icon-sm" variant="ghost" onClick={() => setOrder(value => value === "asc" ? "desc" : "asc")}>
            <Icon icon={order() === "asc" ? "lucide:arrow-down" : "lucide:arrow-up"} class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <label class="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={followLatest()} onChange={(event) => setFollowLatest(event.currentTarget.checked)} />
          <span>{t("stream.followLatest")}</span>
        </label>
        <label class="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={raw()} onChange={(event) => setRaw(event.currentTarget.checked)} />
          <span>{t("stream.rawRecords")}</span>
        </label>
        <Select
          size="sm"
          value={viewMode()}
          onChange={(value) => {
            setViewMode(value as StreamViewMode)
            setSelectedMessage(undefined)
            selectStreamMessage(props.streamId)
          }}
          options={[
            { value: "timeline", label: t("stream.viewTimeline") },
            { value: "completion", label: t("stream.viewCompletion") },
          ]}
          aria-label={t("stream.viewMode")}
          class="w-24 shrink-0"
        />
      </div>
      <div class="flex min-h-0 flex-1 gap-2">
        <MessageLog
          connId={props.streamId}
          sourceMessages={viewMode() === "completion" ? completionMessages() : undefined}
          query={query()}
          order={order()}
          direction="all"
          showTimestamp
          showSSEMetadata
          raw={raw()}
          selectedMessage={selectedMessage()}
          onMessageSelect={(message) => { setSelectedMessage(message); selectStreamMessage(props.streamId, message) }}
          containerRef={(element) => { messageLogElement = element }}
          onScroll={() => { if (followLatest() && !autoScrolling) setFollowLatest(false) }}
        />
        <Show when={selectedMessage()} keyed>
          {(message) => (
            <StreamMessageDetail
              message={message}
              layout="right"
              onClose={() => selectStreamMessage(props.streamId)}
            />
          )}
        </Show>
      </div>
    </div>
  )
}
