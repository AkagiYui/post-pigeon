import { describe, expect, it } from "vitest"

import type { StreamMessage } from "@/stores/stream"

import {
  filterAndSortStreamMessages,
  inferMessageFormat,
  latestMessageScrollTop,
  messageContentForDisplay,
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
})
