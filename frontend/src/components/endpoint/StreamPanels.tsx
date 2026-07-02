// WebSocket / SSE 面板。连接由 Go 侧维护，切换标签页不会断开。
import { Plug, PlugZap, Send, Trash2 } from "lucide-solid"
import { createMemo, createSignal, For, Show } from "solid-js"

import { SSEConnectData, SSEService, WebSocketService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { clearStream, markConnecting, streamMessages, streamStatus } from "@/stores/stream"

function combineWsUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path
  if (/^wss?:\/\//i.test(path) || /^https?:\/\//i.test(path)) return path
  return baseUrl.replace(/\/$/, "") + "/" + path.replace(/^\//, "")
}

function StatusDot(props: { status: string }) {
  const color = () => ({
    open: "bg-green-500", connecting: "bg-amber-500", error: "bg-red-500", closed: "bg-gray-400", idle: "bg-gray-400",
  }[props.status] || "bg-gray-400")
  return <span class={cn("inline-block h-2 w-2 rounded-full", color())} />
}

function MessageLog(props: { connId: string }) {
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

export interface WebSocketPanelProps {
  connId: string
  baseUrl: string
  path: string
}

export function WebSocketPanel(props: WebSocketPanelProps) {
  const [input, setInput] = createSignal("")
  const status = createMemo(() => streamStatus(props.connId))
  const url = () => combineWsUrl(props.baseUrl, props.path)

  const connect = async () => {
    markConnecting(props.connId)
    try { await WebSocketService.Connect(props.connId, url(), {}) } catch (e) { console.error("WebSocket 连接失败", e) }
  }
  const disconnect = async () => { try { await WebSocketService.Close(props.connId) } catch (e) { console.error(e) } }
  const send = async () => {
    if (!input().trim()) return
    try { await WebSocketService.Send(props.connId, input()); setInput("") } catch (e) { console.error("发送失败", e) }
  }

  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <StatusDot status={status()} />
        <span class="text-xs text-muted-foreground truncate flex-1" title={url()}>{url()}</span>
        <Show when={status() !== "open"} fallback={
          <Button size="sm" variant="outline" onClick={disconnect}><Plug class="h-3.5 w-3.5" />{t("stream.disconnect")}</Button>
        }>
          <Button size="sm" onClick={connect}><PlugZap class="h-3.5 w-3.5" />{t("stream.connect")}</Button>
        </Show>
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

export interface SSEPanelProps {
  connId: string
  baseUrl: string
  path: string
  method: string
  body: string
}

export function SSEPanel(props: SSEPanelProps) {
  const status = createMemo(() => streamStatus(props.connId))
  const url = () => combineWsUrl(props.baseUrl, props.path)

  const connect = async () => {
    markConnecting(props.connId)
    const data = new SSEConnectData({ connId: props.connId, url: url(), method: props.method || "GET", headers: {}, body: props.body || "" })
    try { await SSEService.Connect(data) } catch (e) { console.error("SSE 连接失败", e) }
  }
  const disconnect = async () => { try { await SSEService.Close(props.connId) } catch (e) { console.error(e) } }

  return (
    <div class="flex flex-col h-full p-3 gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <StatusDot status={status()} />
        <span class="text-xs text-muted-foreground truncate flex-1" title={url()}>{url()}</span>
        <Show when={status() !== "open"} fallback={
          <Button size="sm" variant="outline" onClick={disconnect}><Plug class="h-3.5 w-3.5" />{t("stream.disconnect")}</Button>
        }>
          <Button size="sm" onClick={connect}><PlugZap class="h-3.5 w-3.5" />{t("stream.connect")}</Button>
        </Show>
        <Button size="icon-sm" variant="ghost" onClick={() => clearStream(props.connId)}><Trash2 class="h-3.5 w-3.5" /></Button>
      </div>

      <MessageLog connId={props.connId} />
    </div>
  )
}
