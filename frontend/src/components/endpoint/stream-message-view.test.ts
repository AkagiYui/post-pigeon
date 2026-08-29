import { describe, expect, it } from "vitest"

import type { StreamMessage } from "@/stores/stream"

import {
  decodeStreamResponseBodyChunks,
  extractStreamJSONPath,
  filterAndSortStreamMessages,
  inferMessageFormat,
  latestMessageScrollTop,
  mergeStreamCompletion,
  messageContentForDisplay,
  streamResponseBody,
} from "./stream-message-view"

const messages: StreamMessage[] = [
  { kind: "open", data: "connected", timestamp: 1 },
  { kind: "sent", data: "Hello Server", timestamp: 2 },
  { kind: "message", data: "hello Client", timestamp: 3 },
  { kind: "error", data: "connection lost", timestamp: 4 },
]

describe("WebSocket message view", () => {
  it("按文本做不区分大小写的包含筛选", () => {
    expect(filterAndSortStreamMessages(messages, "HELLO", "all", "asc"))
      .toEqual([messages[1], messages[2]])
  })

  it("SSE 协议字段也可被检索", () => {
    const sse: StreamMessage = {
      kind: "message", data: "payload", event: "invoice.updated", eventId: "evt-42", timestamp: 5,
    }
    expect(filterAndSortStreamMessages([sse], "EVT-42", "all", "asc")).toEqual([sse])
    expect(filterAndSortStreamMessages([sse], "invoice", "all", "asc")).toEqual([sse])
  })

  it("发送和接收筛选只包含对应的数据帧", () => {
    expect(filterAndSortStreamMessages(messages, "", "sent", "asc")).toEqual([messages[1]])
    expect(filterAndSortStreamMessages(messages, "", "received", "asc")).toEqual([messages[2]])
  })

  it("倒序不修改 store 提供的原数组", () => {
    const source = [...messages]

    expect(filterAndSortStreamMessages(source, "", "all", "desc"))
      .toEqual([...messages].reverse())
    expect(source).toEqual(messages)
  })

  it("跟随最新消息时正序置底、倒序置顶", () => {
    expect(latestMessageScrollTop("asc", 1200, 300)).toBe(900)
    expect(latestMessageScrollTop("desc", 1200, 300)).toBe(0)
    expect(latestMessageScrollTop("asc", 200, 300)).toBe(0)
  })

  it("二进制消息按选定编码解码，文本消息保留原文", () => {
    expect(messageContentForDisplay({ kind: "message", data: "5Lit5paH", binary: true, timestamp: 1 }, "utf-8"))
      .toBe("中文")
    expect(messageContentForDisplay(messages[1], "gbk")).toBe("Hello Server")
  })

  it("为 JSON、XML 和 HTML 消息选择合适的初始格式", () => {
    expect(inferMessageFormat({ kind: "message", data: '{"ok":true}', timestamp: 1 })).toBe("json")
    expect(inferMessageFormat({ kind: "message", data: "<root><ok /></root>", timestamp: 1 })).toBe("xml")
    expect(inferMessageFormat({ kind: "message", data: "<!doctype html><p>ok</p>", timestamp: 1 })).toBe("html")
  })

  it("将 HTTP 流记录持续重组成响应体", () => {
    const stream: StreamMessage[] = [
      { kind: "open", data: "200", timestamp: 1 },
      { kind: "message", data: "first", raw: "event: token\ndata: first", timestamp: 2 },
      { kind: "comment", data: "", comment: "keepalive", hasComment: true, raw: ": keepalive", timestamp: 3 },
      { kind: "message", data: "second", raw: "data: second", timestamp: 4 },
      { kind: "close", data: "stream ended", timestamp: 5 },
    ]
    expect(streamResponseBody(stream, "sse")).toBe("event: token\ndata: first\n\n: keepalive\n\ndata: second")
  })

  it("按 OpenAI 兼容协议提取正文与 reasoning，而非拼接原始 JSON", () => {
    const stream: StreamMessage[] = [
      { kind: "message", data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"think"}}]}', timestamp: 1 },
      { kind: "message", data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" hello"}}]}', timestamp: 2 },
      { kind: "message", data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"}}]}', timestamp: 3 },
    ]
    expect(mergeStreamCompletion(stream)).toEqual({ format: "openai", content: " hello world", reasoning: "think" })
  })

  it("支持 Apifox 同样覆盖的 Claude、Gemini 与 Ollama 流格式", () => {
    expect(mergeStreamCompletion([{ kind: "message", timestamp: 1, data: '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude"}}' }]))
      .toMatchObject({ format: "claude", content: "Claude" })
    expect(mergeStreamCompletion([{ kind: "message", timestamp: 1, data: '{"modelVersion":"x","candidates":[{"content":{"role":"model","parts":[{"text":"Gemini"}]}}]}' }]))
      .toMatchObject({ format: "gemini", content: "Gemini" })
    expect(mergeStreamCompletion([{ kind: "message", timestamp: 1, data: '{"model":"llama","created_at":"x","message":{"role":"assistant","content":"Ollama"},"done":false}' }]))
      .toMatchObject({ format: "ollama-chat", content: "Ollama" })
    expect(mergeStreamCompletion([{ kind: "message", timestamp: 1, data: '{"model":"llama","created_at":"x","response":"Generate","done":false}' }]))
      .toMatchObject({ format: "ollama-generate", content: "Generate" })
  })

  it("自动识别后锁定格式，后续其它 JSON 协议不会污染合并内容", () => {
    const stream: StreamMessage[] = [
      { kind: "message", timestamp: 1, data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"A"}}]}' },
      { kind: "message", timestamp: 2, data: '{"model":"llama","created_at":"x","response":"must not append","done":false}' },
    ]
    expect(mergeStreamCompletion(stream)).toMatchObject({ format: "openai", content: "A" })
  })

  it("自定义 JSONPath 仅提取指定字段", () => {
    const data = '{"choices":[{"delta":{"text":"A"}},{"delta":{"text":"B"}}]}'
    expect(extractStreamJSONPath(data, "$.choices[*].delta.text")).toEqual(["A", "B"])
    expect(mergeStreamCompletion([{ kind: "message", data, timestamp: 1 }], "custom", "$.choices[*].delta.text"))
      .toEqual({ format: "custom", content: "AB", reasoning: "" })
  })

  it("从原始 Base64 分块重组响应体，不损坏跨 chunk 的 UTF-8 字符", () => {
    expect(decodeStreamResponseBodyChunks(["5Lg=", "rQ=="])).toBe("中")
  })
})
