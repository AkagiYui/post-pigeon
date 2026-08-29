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
