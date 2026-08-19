import { describe, expect, it } from "vitest"

import { byteLength, cn, extensionForContentType, extractPathParams, hasURLScheme } from "./utils"

describe("hasURLScheme", () => {
  it("识别常见协议头", () => {
    expect(hasURLScheme("https://x.com")).toBe(true)
    expect(hasURLScheme("wss://x.com/socket")).toBe(true)
    expect(hasURLScheme("  http://x.com  ")).toBe(true)
  })

  it("相对路径不算绝对地址", () => {
    expect(hasURLScheme("/api/users")).toBe(false)
    expect(hasURLScheme("api/users")).toBe(false)
    expect(hasURLScheme("")).toBe(false)
  })
})

describe("extractPathParams", () => {
  it("按出现顺序去重提取", () => {
    expect(extractPathParams("/users/{id}/posts/{postId}")).toEqual(["id", "postId"])
    expect(extractPathParams("/a/{id}/b/{id}")).toEqual(["id"])
  })

  it("无参数时返回空数组", () => {
    expect(extractPathParams("/users")).toEqual([])
    expect(extractPathParams("")).toEqual([])
  })
})

describe("byteLength", () => {
  it("按 UTF-8 计算字节数", () => {
    expect(byteLength("abc")).toBe(3)
    expect(byteLength("中文")).toBe(6)
    expect(byteLength("")).toBe(0)
  })
})

describe("extensionForContentType", () => {
  it("映射常见类型", () => {
    expect(extensionForContentType("application/json; charset=utf-8")).toBe(".json")
    expect(extensionForContentType("image/png")).toBe(".png")
    expect(extensionForContentType("application/pdf")).toBe(".pdf")
  })

  it("结构化后缀兜底", () => {
    expect(extensionForContentType("application/vnd.api+json")).toBe(".json")
    expect(extensionForContentType("image/svg+xml")).toBe(".svg")
  })

  it("未知类型退回子类型", () => {
    expect(extensionForContentType("application/x-custom")).toBe(".x-custom")
    expect(extensionForContentType("")).toBe("")
  })
})

describe("cn", () => {
  it("合并类名并解决 Tailwind 冲突", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("text-sm", false && "hidden", "font-medium")).toBe("text-sm font-medium")
  })
})
