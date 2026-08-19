import { describe, expect, it } from "vitest"

import { decodeRawBody, formatBody, formatFromContentType } from "./format"

describe("formatFromContentType", () => {
  it("识别 JSON 及其结构化后缀", () => {
    expect(formatFromContentType("application/json")).toBe("json")
    expect(formatFromContentType("application/json; charset=utf-8")).toBe("json")
    expect(formatFromContentType("application/vnd.api+json")).toBe("json")
    expect(formatFromContentType("text/json")).toBe("json")
  })

  it("识别 HTML 与 XML", () => {
    expect(formatFromContentType("text/html")).toBe("html")
    expect(formatFromContentType("application/xhtml+xml")).toBe("html")
    expect(formatFromContentType("text/xml")).toBe("xml")
    expect(formatFromContentType("image/svg+xml")).toBe("xml")
  })

  it("无法识别时返回 null", () => {
    expect(formatFromContentType("text/plain")).toBeNull()
    expect(formatFromContentType("")).toBeNull()
    expect(formatFromContentType(null)).toBeNull()
    expect(formatFromContentType(undefined)).toBeNull()
  })
})

describe("formatBody", () => {
  it("美化 JSON", () => {
    expect(formatBody("{\"a\":1}", "json")).toBe("{\n  \"a\": 1\n}")
  })

  it("非法 JSON 原样返回", () => {
    expect(formatBody("not json", "json")).toBe("not json")
  })

  it("空串原样返回", () => {
    expect(formatBody("", "json")).toBe("")
  })

  it("按标签缩进 XML", () => {
    expect(formatBody("<a><b>1</b></a>", "xml")).toBe("<a>\n  <b>1</b>\n</a>")
  })
})

describe("decodeRawBody", () => {
  it("按 UTF-8 解码 base64", () => {
    // "中文" 的 UTF-8 base64
    expect(decodeRawBody("5Lit5paH", "utf-8")).toBe("中文")
  })

  it("空输入返回 null", () => {
    expect(decodeRawBody("", "utf-8")).toBeNull()
  })

  it("不支持的字符集返回 null 由调用方回退", () => {
    expect(decodeRawBody("5Lit5paH", "not-a-charset")).toBeNull()
  })
})
