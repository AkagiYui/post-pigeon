// 流式视图组件：WebSocket 消息流 + HTTP 流式响应（text/event-stream）。连接由 Go 侧维护，切换标签页不会断开。
// WebSocket 端点复用普通接口详情页布局：连接按钮在顶部请求行，响应区为消息流。
// 普通接口收到 text/event-stream 响应时，响应区展示实时事件流（SSE 只是流式响应的一种文本规范）。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"

import { WebSocketService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { parseJSONForDisplay } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  clearWebSocketMessageAfterSend,
  formatWebSocketJSON,
  parseWebSocketJSON,
  setClearWebSocketMessageAfterSend,
  setFormatWebSocketJSON,
  setParseWebSocketJSON,
} from "@/stores/app"
import { clearStreamMessages, streamMessages, streamStatus } from "@/stores/stream"
import { toastError } from "@/stores/toast"

import {
  filterAndSortStreamMessages,
  latestMessageScrollTop,
  type StreamMessageDirection,
  type StreamMessageOrder,
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
  parseJSON?: boolean
  formatJSON?: boolean
  query?: string
  direction?: StreamMessageDirection
  order?: StreamMessageOrder
  showTimestamp?: boolean
  containerRef?: (element: HTMLDivElement) => void
  onScroll?: () => void
}) {
  const allMessages = createMemo(() => streamMessages(props.connId))
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
          <div class="flex items-start gap-2 text-xs font-mono">
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
            <span class="min-w-0 break-all whitespace-pre-wrap text-foreground">{displayData(m.data, m.binary)}</span>
          </div>
        )}
      </For>
    </div>
  )
}

/** WebSocket 消息编辑器：位于请求编辑区的首个“消息”标签页。 */
export function WebSocketMessageEditor(props: {
  connId: string
  value: string
  onChange: (value: string) => void
}) {
  const status = createMemo(() => streamStatus(props.connId))

  const send = async () => {
    if (!props.value.trim()) return
    try {
      await WebSocketService.Send(props.connId, props.value)
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
      <Textarea
        value={props.value}
        onInput={(event) => props.onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            void send()
          }
        }}
        placeholder={t("stream.messagePlaceholder")}
        aria-label={t("stream.messagePlaceholder")}
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

/** WebSocket 响应区：消息流（连接按钮在顶部请求行，发送框在请求编辑区） */
export function WebSocketResponse(props: { connId: string }) {
  const [query, setQuery] = createSignal("")
  const [direction, setDirection] = createSignal<StreamMessageDirection>("all")
  const [order, setOrder] = createSignal<StreamMessageOrder>("asc")
  const [followLatest, setFollowLatest] = createSignal(true)
  const status = createMemo(() => streamStatus(props.connId))
  const messageCount = createMemo(() => streamMessages(props.connId).length)
  let messageLogElement: HTMLDivElement | undefined
  let scrollFrame: number | undefined
  let releaseScrollFrame: number | undefined
  let autoScrolling = false

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
      <MessageLog
        connId={props.connId}
        parseJSON={parseWebSocketJSON()}
        formatJSON={formatWebSocketJSON()}
        query={query()}
        direction={direction()}
        order={order()}
        showTimestamp
        containerRef={(element) => { messageLogElement = element }}
        onScroll={() => {
          if (followLatest() && !autoScrolling) setFollowLatest(false)
        }}
      />
    </div>
  )
}

/** 流式响应区：实时事件流 + 停止按钮（用于响应体为 text/event-stream 的流式 HTTP 响应） */
export function StreamEventLog(props: { streamId: string; onStop?: () => void }) {
  const status = createMemo(() => streamStatus(props.streamId))
  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{status() === "open" ? t("stream.streaming") : t("stream.streamEnded")}</span>
        <span class="flex-1" />
        <Show when={status() === "open"}>
          <Button size="sm" variant="outline" onClick={props.onStop}><Icon icon="lucide:circle-stop" class="h-3.5 w-3.5" />{t("stream.stop")}</Button>
        </Show>
        <Button size="icon-sm" variant="ghost" onClick={() => clearStreamMessages(props.streamId)}><Icon icon="lucide:trash-2" class="h-3.5 w-3.5" /></Button>
      </div>
      <MessageLog connId={props.streamId} />
    </div>
  )
}
