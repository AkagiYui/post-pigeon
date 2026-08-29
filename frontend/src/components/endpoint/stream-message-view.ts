import { decodeRawBody } from "@/lib/format"
import type { StreamMessage } from "@/stores/stream"

export type StreamMessageDirection = "all" | "sent" | "received"
export type StreamMessageOrder = "asc" | "desc"
export type StreamViewMode = "timeline" | "completion"

/** 流记录原文在响应体页签中使用的分隔符。SSE 的空行界定事件，JSON 记录流一行一条。 */
function streamRecordSeparator(format?: string): string {
  return format === "sse" ? "\n\n" : "\n"
}

/** 取得参与 HTTP 流响应的记录，排除连接状态、重连和关闭等 UI 事件。 */
function responseRecords(messages: StreamMessage[]): StreamMessage[] {
  return messages.filter((message) => message.kind === "message" || message.kind === "comment")
}

/**
 * 汇总流式 HTTP 响应的协议原文，供普通「响应体」页签与下载复用。
 *
 * SSE / NDJSON 由解析器拆成记录后才抵达前端；这里按其记录边界重新组合，因此响应体在流未结束时
 * 也会持续更新。优先用 Raw，既保留 SSE 的 event/id/retry 字段，也保留 JSON Sequence 的 RS 前缀。
 */
export function streamResponseBody(messages: StreamMessage[], format?: string): string {
  return responseRecords(messages)
    .map((message) => message.raw ?? (message.hasComment ? `: ${message.comment ?? ""}` : message.data))
    .join(streamRecordSeparator(format))
}

/**
 * 将逐条 HTTP 流记录合并为一个实时更新的 completion 项。
 *
 * 不猜测 OpenAI/Gemini 等私有 JSON schema；使用换行保留记录边界，避免把两个独立 JSON 对象黏成
 * 一个无法辨认的字符串。调用方每收到新记录就重算，因而该项始终代表当前已接收的完整内容。
 */
export function mergeStreamRecords(messages: StreamMessage[], format?: string): StreamMessage | undefined {
  const records = responseRecords(messages)
  if (records.length === 0) return undefined
  const last = records[records.length - 1]
  return {
    kind: "message",
    data: records.filter((message) => !message.hasComment).map((message) => message.data).join("\n"),
    raw: streamResponseBody(records, format),
    timestamp: last.timestamp,
  }
}

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
    const searchable = [message.data, message.event, message.eventId, message.comment]
      .filter((value): value is string => value != null)
      .join("\n")
      .toLocaleLowerCase()
    return keyword === "" || searchable.includes(keyword)
  })

  if (order === "asc") return filtered
  return [...filtered].reverse()
}
