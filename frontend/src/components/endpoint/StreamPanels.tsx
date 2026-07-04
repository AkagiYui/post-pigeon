// WebSocket / SSE 流式视图组件。连接由 Go 侧维护，切换标签页不会断开。
// WebSocket 端点复用普通接口详情页布局：连接按钮在顶部请求行，响应区为消息流。
// 普通接口收到 SSE 响应时，响应区展示实时事件流。
import { CircleStop, Send, Trash2 } from "lucide-solid"
import { createMemo, createSignal, For, Show } from "solid-js"

import { WebSocketService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { clearStream, streamMessages, streamStatus } from "@/stores/stream"

/** 组合 WebSocket URL（路径自带协议头时视为绝对地址） */
export function wsUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path
  if (/^[a-z]+:\/\//i.test(path)) return path
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

export function StatusDot(props: { status: string }) {
  const color = () => ({
    open: "bg-green-500", connecting: "bg-amber-500", error: "bg-red-500", closed: "bg-gray-400", idle: "bg-gray-400",
  }[props.status] || "bg-gray-400")
  return <span class={cn("inline-block h-2 w-2 rounded-full", color())} />
}

/** 消息流日志（按 connId 从全局 store 读取，切换标签页不丢失） */
export function MessageLog(props: { connId: string }) {
  const msgs = createMemo(() => streamMessages(props.connId))
  return (
    <div class="flex-1 min-h-0 overflow-auto rounded-md border border-border bg-input p-2 flex flex-col gap-1">
      <For each={msgs()} fallback={<div class="text-xs text-muted-foreground text-center py-4">{t("stream.noMessages")}</div>}>
        {(m) => (
          <div class="flex items-start gap-2 text-xs font-mono">
            <span class={cn(
              "shrink-0 px-1 rounded text-[10px]",
              m.kind === "sent" ? "bg-blue-500/15 text-blue-500"
                : m.kind === "message" ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : m.kind === "error" ? "bg-red-500/15 text-red-500"
                    : "bg-muted text-muted-foreground",
            )}>{m.kind === "sent" ? "↑" : m.kind === "message" ? "↓" : m.kind}</span>
            <span class="break-all whitespace-pre-wrap text-foreground">{m.data}</span>
          </div>
        )}
      </For>
    </div>
  )
}

/** WebSocket 响应区：消息流 + 发送框（连接按钮在顶部请求行） */
export function WebSocketResponse(props: { connId: string }) {
  const [input, setInput] = createSignal("")
  const status = createMemo(() => streamStatus(props.connId))

  const send = async () => {
    if (!input().trim()) return
    try {
      await WebSocketService.Send(props.connId, input())
      setInput("")
    } catch (e) { console.error("发送失败", e) }
  }

  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{t("stream.messages")}</span>
        <span class="flex-1" />
        <Button size="icon-sm" variant="ghost" onClick={() => clearStream(props.connId)}><Trash2 class="h-3.5 w-3.5" /></Button>
      </div>
      <MessageLog connId={props.connId} />
      <div class="flex items-center gap-2 shrink-0">
        <Input size="sm" value={input()} onInput={(e) => setInput(e.currentTarget.value)} placeholder={t("stream.messagePlaceholder")} onKeyDown={(e) => e.key === "Enter" && send()} class="flex-1" disabled={status() !== "open"} />
        <Button size="sm" onClick={send} disabled={status() !== "open"}><Send class="h-3.5 w-3.5" />{t("stream.send")}</Button>
      </div>
    </div>
  )
}

/** SSE 流式响应区：实时事件流 + 停止按钮（用于普通接口的 event-stream 响应） */
export function StreamEventLog(props: { streamId: string; onStop?: () => void }) {
  const status = createMemo(() => streamStatus(props.streamId))
  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <StatusDot status={status()} />
        <span>{status() === "open" ? t("stream.streaming") : t("stream.streamEnded")}</span>
        <span class="flex-1" />
        <Show when={status() === "open"}>
          <Button size="sm" variant="outline" onClick={props.onStop}><CircleStop class="h-3.5 w-3.5" />{t("stream.stop")}</Button>
        </Show>
        <Button size="icon-sm" variant="ghost" onClick={() => clearStream(props.streamId)}><Trash2 class="h-3.5 w-3.5" /></Button>
      </div>
      <MessageLog connId={props.streamId} />
    </div>
  )
}
