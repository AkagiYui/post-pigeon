import { describe, expect, it } from "vitest"

import { errorCode, errorMessage, isCanceled, parseAppError } from "./errors"

/** 构造一条后端 apperr 编码后的错误消息 */
function appErrorJSON(code: string, params?: Record<string, string>, cause?: string): string {
  return JSON.stringify({ $kind: "post-pigeon/error", code, params, cause })
}

describe("parseAppError", () => {
  it("解析后端结构化错误", () => {
    const parsed = parseAppError(new Error(appErrorJSON("http.timeout", { url: "http://x" }, "context deadline exceeded")))
    expect(parsed).toEqual({
      code: "http.timeout",
      params: { url: "http://x" },
      cause: "context deadline exceeded",
    })
  })

  it("接受字符串形式的错误", () => {
    expect(parseAppError(appErrorJSON("http.canceled"))?.code).toBe("http.canceled")
  })

  it("普通错误返回 null", () => {
    expect(parseAppError(new Error("boom"))).toBeNull()
    expect(parseAppError("plain text")).toBeNull()
    expect(parseAppError(null)).toBeNull()
    expect(parseAppError(undefined)).toBeNull()
  })

  it("缺少标记的 JSON 不误判", () => {
    expect(parseAppError(JSON.stringify({ code: "http.timeout" }))).toBeNull()
  })

  it("非法 JSON 不抛异常", () => {
    expect(parseAppError("{post-pigeon/error")).toBeNull()
  })
})

describe("errorMessage", () => {
  it("已配词条的错误码渲染为本地化文案", () => {
    // 默认语言 zh-CN
    expect(errorMessage(new Error(appErrorJSON("http.timeout")))).toBe("请求超时")
  })

  it("渲染词条中的插值参数", () => {
    const msg = errorMessage(new Error(appErrorJSON("http.invalid_url", { url: "ht!tp://x" })))
    expect(msg).toContain("ht!tp://x")
  })

  it("未配词条时回退到后端给的原因", () => {
    const msg = errorMessage(new Error(appErrorJSON("some.unmapped_code", undefined, "raw cause")))
    expect(msg).toBe("raw cause")
  })

  it("普通错误带上下文文案", () => {
    expect(errorMessage(new Error("boom"), "error.op.saveFailed")).toBe("保存失败：boom")
  })

  it("空错误回退到未知错误", () => {
    expect(errorMessage(null)).toBe("发生未知错误")
  })
})

describe("errorCode / isCanceled", () => {
  it("取出错误码", () => {
    expect(errorCode(new Error(appErrorJSON("ws.connect")))).toBe("ws.connect")
    expect(errorCode(new Error("boom"))).toBe("")
  })

  it("识别用户主动取消", () => {
    expect(isCanceled(new Error(appErrorJSON("http.canceled")))).toBe(true)
    expect(isCanceled(new Error(appErrorJSON("http.timeout")))).toBe(false)
    expect(isCanceled(new Error("boom"))).toBe(false)
  })
})
