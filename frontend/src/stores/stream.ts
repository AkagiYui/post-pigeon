// 流式连接的全局状态：WebSocket 消息流 + HTTP 流式响应（text/event-stream）。
// 连接存活于 Go 侧；本 store 在模块级订阅一次 Wails 事件，按 connId 缓冲消息，
// 这样即使前端切换标签页（面板组件卸载）也不会丢失消息。
// 注意：SSE 不是独立的请求类型，只是响应体为 text/event-stream 的流式 HTTP 响应，
// 因此其事件与普通流式响应统一走 http:stream。
import { Events } from "@wailsio/runtime"
import { createRoot, createSignal } from "solid-js"

export interface StreamMessage {
  kind: string // open, message, sent, close, error
  data: string
  timestamp: number
}

export type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error"

interface StreamState {
  messages: Record<string, StreamMessage[]>
  status: Record<string, StreamStatus>
}

const WS_EVENT = "ws:event"
const HTTP_STREAM_EVENT = "http:stream"

const [state, setState] = createRoot(() => {
  const [get, set] = createSignal<StreamState>({ messages: {}, status: {} })
  return [get, set] as const
})

function applyEvent(ev: { connId: string; kind: string; data: string; timestamp: number }) {
  if (!ev || !ev.connId) return
  setState((prev) => {
    const messages = { ...prev.messages }
    const status = { ...prev.status }
    const list = messages[ev.connId] ? [...messages[ev.connId]] : []
    list.push({ kind: ev.kind, data: ev.data, timestamp: ev.timestamp })
    // 限制单连接缓冲上限，避免长连接内存膨胀
    if (list.length > 1000) list.splice(0, list.length - 1000)
    messages[ev.connId] = list
    if (ev.kind === "open") status[ev.connId] = "open"
    else if (ev.kind === "close") status[ev.connId] = "closed"
    else if (ev.kind === "error") status[ev.connId] = "error"
    return { messages, status }
  })
}

// 模块级订阅一次
if (typeof window !== "undefined") {
  try {
    Events.On(WS_EVENT, (e: any) => applyEvent(e?.data))
    Events.On(HTTP_STREAM_EVENT, (e: any) => applyEvent(e?.data))
  } catch (err) {
    console.error("订阅流式事件失败", err)
  }
}

/** 获取指定连接的消息列表 */
export function streamMessages(connId: string): StreamMessage[] {
  return state().messages[connId] || []
}

/** 获取指定连接的状态 */
export function streamStatus(connId: string): StreamStatus {
  return state().status[connId] || "idle"
}

/** 标记连接为「连接中」（发起连接时调用） */
export function markConnecting(connId: string) {
  setState((prev) => ({ ...prev, status: { ...prev.status, [connId]: "connecting" } }))
}

/** 清空指定连接的消息缓冲 */
export function clearStream(connId: string) {
  setState((prev) => {
    const messages = { ...prev.messages }
    delete messages[connId]
    return { ...prev, messages }
  })
}
