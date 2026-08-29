import { decodeRawBody } from "@/lib/format"
import type { StreamMessage } from "@/stores/stream"

import type { StreamCompletionFormat, StreamViewMode } from "./editor-types"

export type StreamMessageDirection = "all" | "sent" | "received"
export type StreamMessageOrder = "asc" | "desc"
export type { StreamCompletionFormat, StreamViewMode }

export interface StreamCompletion {
  /** 实际被采用的协议格式；自动模式在首条可识别消息后锁定。 */
  format: Exclude<StreamCompletionFormat, "auto">
  content: string
  reasoning: string
}

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

/** 将后端分块推送的原始字节一次解码，避免 UTF-8 字符被恰好切在两个 chunk 之间时损坏。 */
export function decodeStreamResponseBodyChunks(chunks: string[]): string {
  if (chunks.length === 0) return ""
  const bytes = chunks.map((chunk) => Uint8Array.from(atob(chunk), (char) => char.charCodeAt(0)))
  const length = bytes.reduce((total, chunk) => total + chunk.length, 0)
  const joined = new Uint8Array(length)
  let offset = 0
  for (const chunk of bytes) {
    joined.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder("utf-8").decode(joined)
}

type JSONRecord = Record<string, unknown>

function jsonRecord(data: string): JSONRecord | undefined {
  try {
    const value: unknown = JSON.parse(data)
    return value != null && typeof value === "object" && !Array.isArray(value) ? value as JSONRecord : undefined
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): JSONRecord | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as JSONRecord : undefined
}

function asRecords(value: unknown): JSONRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is JSONRecord => item != null) : []
}

/** Apifox 支持的 LLM 流式协议及其实际增量字段。 */
function extractCompletionPart(format: Exclude<StreamCompletionFormat, "auto" | "custom">, data: string): { content?: string; reasoning?: string } | undefined {
  const value = jsonRecord(data)
  if (!value) return undefined
  switch (format) {
    case "openai": {
      if (typeof value.id !== "string" || typeof value.created !== "number" || typeof value.model !== "string" || value.object !== "chat.completion.chunk") return undefined
      const choices = asRecords(value.choices)
      if (choices.length === 0) return undefined
      let content = ""
      let reasoning = ""
      let matched = false
      for (const choice of choices) {
        const delta = asRecord(choice.delta)
        if (!delta) continue
        matched = true
        if (typeof delta.content === "string") content += delta.content
        const thought = delta.reasoning_content ?? delta.reasoning
        if (typeof thought === "string") reasoning += thought
      }
      return matched ? { content, reasoning } : undefined
    }
    case "gemini": {
      if (typeof value.modelVersion !== "string") return undefined
      let content = ""
      let matched = false
      for (const candidate of asRecords(value.candidates)) {
        const message = asRecord(candidate.content)
        if (message?.role !== "model") continue
        for (const part of asRecords(message.parts)) {
          if (typeof part.text === "string") content += part.text
          matched = true
        }
      }
      return matched ? { content } : undefined
    }
    case "claude": {
      const delta = asRecord(value.delta)
      if (value.type !== "content_block_delta" || delta?.type !== "text_delta" || typeof delta.text !== "string") return undefined
      return { content: delta.text }
    }
    case "ollama-generate":
      return typeof value.model === "string" && typeof value.created_at === "string" && typeof value.done === "boolean" && typeof value.response === "string"
        ? { content: value.response }
        : undefined
    case "ollama-chat": {
      const message = asRecord(value.message)
      return typeof value.model === "string" && typeof value.created_at === "string" && typeof value.done === "boolean" && typeof message?.role === "string" && typeof message.content === "string"
        ? { content: message.content }
        : undefined
    }
  }
}

/** 简化且明确的 JSONPath：支持 $.a.b、[0] 与 [*]，覆盖 LLM 嵌套字段的常见写法。 */
export function extractStreamJSONPath(data: string, path: string): string[] {
  const root = jsonRecord(data)
  if (!root || !path.startsWith("$")) return []
  const tokens = [...path.matchAll(/(?:\.([A-Za-z_$][\w$]*))|\[(\d+|\*)\]/g)]
  if (tokens.length === 0 && path !== "$") return []
  let values: unknown[] = [root]
  for (const token of tokens) {
    const property = token[1]
    const index = token[2]
    values = values.flatMap((value) => {
      if (property) {
        const record = asRecord(value)
        return record && property in record ? [record[property]] : []
      }
      if (!Array.isArray(value)) return []
      return index === "*" ? value : value[Number(index)] === undefined ? [] : [value[Number(index)]]
    })
  }
  return values.filter((value): value is string => typeof value === "string")
}

function detectCompletionFormat(data: string, customJSONPath: string): Exclude<StreamCompletionFormat, "auto"> | undefined {
  for (const candidate of ["openai", "gemini", "claude", "ollama-chat", "ollama-generate"] as const) {
    if (extractCompletionPart(candidate, data) !== undefined) return candidate
  }
  return customJSONPath && extractStreamJSONPath(data, customJSONPath).length > 0 ? "custom" : undefined
}

/**
 * 复刻 Apifox Completion 的核心：自动检测第一条可识别的协议并锁定格式，随后仅抽取该协议的增量
 * 内容和 reasoning；不会把任意 JSON 或 SSE 原文无脑拼到一起。
 */
export function mergeStreamCompletion(
  messages: StreamMessage[],
  requestedFormat: StreamCompletionFormat = "auto",
  customJSONPath = "",
): StreamCompletion | undefined {
  const records = responseRecords(messages).filter((message) => !message.hasComment)
  if (requestedFormat === "custom" && !customJSONPath) return undefined
  let format: Exclude<StreamCompletionFormat, "auto"> | undefined = requestedFormat === "auto" ? undefined : requestedFormat
  let content = ""
  let reasoning = ""
  for (const record of records) {
    if (!format) format = detectCompletionFormat(record.data, customJSONPath)
    if (!format) continue
    if (format === "custom") {
      content += extractStreamJSONPath(record.data, customJSONPath).join("")
      continue
    }
    const part = extractCompletionPart(format, record.data)
    if (!part) continue
    content += part.content ?? ""
    reasoning += part.reasoning ?? ""
  }
  return format ? { format, content, reasoning } : undefined
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
