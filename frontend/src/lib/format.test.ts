import { describe, expect, it } from "vitest"

import { decodeRawBody, formatBody, formatBuildTime, formatFromContentType } from "./format"

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

describe("formatBuildTime", () => {
  it("带上时区标识，且时区在最后而不是夹在日期和时间中间", () => {
    const got = formatBuildTime("2026-08-26T07:52:59Z")
    expect(got).not.toBeNull()
    // 形如 2026/08/26 15:52:59 GMT+8（具体时刻随运行环境的时区而变）
    expect(got).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} GMT[+-]\d/)
  })

  it("展示的是本地时区的时刻", () => {
    const iso = "2026-08-26T07:52:59Z"
    const got = formatBuildTime(iso)!
    const local = new Date(iso).toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
    expect(got.startsWith(local)).toBe(true)
  })

  it("解析不了时返回 null，交给调用方原样展示", () => {
    expect(formatBuildTime("dev")).toBeNull()
    expect(formatBuildTime("")).toBeNull()
    expect(formatBuildTime("not a timestamp")).toBeNull()
  })
})
