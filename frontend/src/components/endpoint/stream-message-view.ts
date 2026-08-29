import { decodeRawBody } from "@/lib/format"
import type { StreamMessage } from "@/stores/stream"

export type StreamMessageDirection = "all" | "sent" | "received"
export type StreamMessageOrder = "asc" | "desc"

/** 跟随最新消息时，各排序方向对应的滚动位置。 */
export function latestMessageScrollTop(
  order: StreamMessageOrder,
  scrollHeight: number,
  clientHeight: number,
): number {
  return order === "asc" ? Math.max(0, scrollHeight - clientHeight) : 0
}

/**
 * 取得消息详情中可展示的文本。
 *
 * WebSocket 文本帧已经由服务端按 UTF-8 传入；二进制帧则保留 base64，以便在这里按用户
 * 选定的字符集重新解码。解码失败时保留原始 base64，避免详情面板变成空白。
 */
export function messageContentForDisplay(message: StreamMessage, encoding: string): string {
  if (!message.binary) return message.data
  return decodeRawBody(message.data, encoding) ?? message.data
}

/** 根据消息正文猜测详情面板的初始格式；用户仍可在详情里手动修改。 */
export function inferMessageFormat(message: StreamMessage): "json" | "xml" | "html" {
  const content = messageContentForDisplay(message, "utf-8").trim()
  if (/^<!doctype\s+html|^<html[\s>]/i.test(content)) return "html"
  if (content.startsWith("<")) return "xml"
  try {
    JSON.parse(content)
    return "json"
  } catch {
    return "json"
  }
}

/**
 * WebSocket 消息列表的纯视图变换。
 *
 * 连接事件只在「全部」中出现；「发送 / 接收」严格对应实际数据帧，避免把 open、close、error
 * 误算成接收消息。排序始终复制原数组，不改动 stream store 中的到达顺序。
 */
export function filterAndSortStreamMessages(
  messages: StreamMessage[],
  query: string,
  direction: StreamMessageDirection,
  order: StreamMessageOrder,
): StreamMessage[] {
  const keyword = query.toLocaleLowerCase()
  const filtered = messages.filter((message) => {
    if (direction === "sent" && message.kind !== "sent") return false
    if (direction === "received" && message.kind !== "message") return false
    return keyword === "" || message.data.toLocaleLowerCase().includes(keyword)
  })

  if (order === "asc") return filtered
  return [...filtered].reverse()
}
