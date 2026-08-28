import { describe, expect, it } from "vitest"

import { engineVersionFromUserAgent } from "./webview"

describe("engineVersionFromUserAgent", () => {
  it("从 WebView2 的 UA 里取 Chrome 版本", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/132.0.0.0 Safari/537.36 Edg/132.0.2957.140"
    expect(engineVersionFromUserAgent(ua)).toBe("132.0.0.0")
  })

  it("从 WKWebView 的 UA 里取 Safari 版本，而不是 AppleWebKit 号", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) " +
      "Version/17.4 Safari/605.1.15"
    expect(engineVersionFromUserAgent(ua)).toBe("17.4")
  })

  it("没有 Version/ 段时退回 AppleWebKit 号（WebKitGTK）", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15"
    expect(engineVersionFromUserAgent(ua)).toBe("605.1.15")
  })

  it("解析不出时返回空串，而不是抛异常", () => {
    expect(engineVersionFromUserAgent("")).toBe("")
    expect(engineVersionFromUserAgent("完全不像 UA 的一段话")).toBe("")
  })
})
