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
  /** 为 true 时 data 是 base64 编码的二进制帧，展示前需自行解码 */
  binary?: boolean
  timestamp: number
  /** SSE event: 字段（空值时服务端事件类型为 message） */
  event?: string
  /** SSE id: 字段；hasEventId 为真时空字符串也有语义（重置 Last-Event-ID） */
  eventId?: string
  hasEventId?: boolean
  /** SSE retry: 字段（毫秒） */
  retry?: number
  hasRetry?: boolean
  /** SSE 注释行，不属于 data 正文 */
  comment?: string
  hasComment?: boolean
  raw?: string
}

export type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error"

interface StreamState {
  messages: Record<string, StreamMessage[]>
  status: Record<string, StreamStatus>
  /** 每个连接当前在详情面板中选中的消息；组件卸载后也保留。 */
  selectedMessages: Record<string, StreamMessage>
}

const WS_EVENT = "ws:event"
const HTTP_STREAM_EVENT = "http:stream"

const [state, setState] = createRoot(() => {
  const [get, set] = createSignal<StreamState>({ messages: {}, status: {}, selectedMessages: {} })
  return [get, set] as const
})

interface StreamEventPayload {
  connId: string
  kind: string
  data: string
  binary?: boolean
  timestamp: number
  event?: string
  eventId?: string
  hasEventId?: boolean
  retry?: number
  hasRetry?: boolean
  comment?: string
  hasComment?: boolean
  raw?: string
}

function applyEvent(ev: StreamEventPayload | undefined) {
  if (!ev || !ev.connId) return
  setState((prev) => {
    const messages = { ...prev.messages }
    const status = { ...prev.status }
    const selectedMessages = { ...prev.selectedMessages }
    const list = messages[ev.connId] ? [...messages[ev.connId]] : []
    list.push({
      kind: ev.kind, data: ev.data, binary: ev.binary, timestamp: ev.timestamp,
      event: ev.event, eventId: ev.eventId, hasEventId: ev.hasEventId,
      retry: ev.retry, hasRetry: ev.hasRetry, comment: ev.comment, hasComment: ev.hasComment, raw: ev.raw,
    })
    // 限制单连接缓冲上限，避免长连接内存膨胀
    if (list.length > 1000) list.splice(0, list.length - 1000)
    messages[ev.connId] = list
    // 滚动淘汰时，详情不能继续指向已被丢弃的旧消息。
    if (selectedMessages[ev.connId] && !list.includes(selectedMessages[ev.connId])) {
      delete selectedMessages[ev.connId]
    }
    if (ev.kind === "open") status[ev.connId] = "open"
    else if (ev.kind === "close") status[ev.connId] = "closed"
    else if (ev.kind === "error") status[ev.connId] = "error"
    return { messages, status, selectedMessages }
  })
}

// 模块级订阅一次。
// 这里刻意保留 console.error 而非 toast：本模块在应用挂载前就已执行，
// 此时 Toaster 尚未渲染，提示无处可去。
if (typeof window !== "undefined") {
  try {
    Events.On(WS_EVENT, (e: { data?: StreamEventPayload }) => applyEvent(e?.data))
    Events.On(HTTP_STREAM_EVENT, (e: { data?: StreamEventPayload }) => applyEvent(e?.data))
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

/** 获取指定连接当前展开详情的消息。选择状态随连接保留，供接口/响应 Tab 重新挂载后恢复。 */
export function selectedStreamMessage(connId: string): StreamMessage | undefined {
  return state().selectedMessages[connId]
}

/** 选择或关闭指定连接的消息详情。 */
export function selectStreamMessage(connId: string, message?: StreamMessage) {
  setState((prev) => {
    const selectedMessages = { ...prev.selectedMessages }
    if (message) selectedMessages[connId] = message
    else delete selectedMessages[connId]
    return { ...prev, selectedMessages }
  })
}

/** 标记连接为「连接中」（发起连接时调用） */
export function markConnecting(connId: string) {
  setState((prev) => ({ ...prev, status: { ...prev.status, [connId]: "connecting" } }))
}

/** 只清空消息记录，保留 open/connecting/closed/error 连接状态。
 * 消息面板的垃圾桶使用它，避免仍存活的 WebSocket 在界面上变成 idle。 */
export function clearStreamMessages(connId: string) {
  setState((prev) => {
    const messages = { ...prev.messages }
    const selectedMessages = { ...prev.selectedMessages }
    delete messages[connId]
    delete selectedMessages[connId]
    return { ...prev, messages, selectedMessages }
  })
}

/** 清空指定连接的消息缓冲与状态。
 * 状态必须一并清掉：只清消息会把上次的 closed/error 状态残留到新一轮连接上。 */
export function clearStream(connId: string) {
  setState((prev) => {
    const messages = { ...prev.messages }
    const status = { ...prev.status }
    const selectedMessages = { ...prev.selectedMessages }
    delete messages[connId]
    delete status[connId]
    delete selectedMessages[connId]
    return { messages, status, selectedMessages }
  })
}
