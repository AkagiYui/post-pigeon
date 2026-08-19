import { afterEach, describe, expect, it, vi } from "vitest"

import { dismissAllToasts, dismissToast, showToast, toastError, toasts } from "./toast"

afterEach(() => {
  dismissAllToasts()
  vi.useRealTimers()
})

describe("showToast", () => {
  it("推入提示并可手动关闭", () => {
    const id = showToast("info", "hello")
    expect(toasts()).toHaveLength(1)
    expect(toasts()[0]).toMatchObject({ kind: "info", message: "hello" })

    dismissToast(id)
    expect(toasts()).toHaveLength(0)
  })

  it("到时自动关闭", () => {
    vi.useFakeTimers()
    showToast("success", "saved", { duration: 1000 })
    expect(toasts()).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(toasts()).toHaveLength(0)
  })

  it("duration=0 时不自动关闭", () => {
    vi.useFakeTimers()
    showToast("error", "sticky", { duration: 0 })
    vi.advanceTimersByTime(60_000)
    expect(toasts()).toHaveLength(1)
  })

  it("超过上限时挤掉最旧的一条", () => {
    for (let i = 0; i < 8; i++) showToast("info", `msg-${i}`, { duration: 0 })
    const list = toasts()
    expect(list).toHaveLength(5)
    expect(list[0].message).toBe("msg-3")
    expect(list[4].message).toBe("msg-7")
  })
})

describe("toastError", () => {
  it("把后端错误码翻成本地化文案", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    toastError(new Error(JSON.stringify({ $kind: "post-pigeon/error", code: "http.timeout" })))
    expect(toasts()[0]).toMatchObject({ kind: "error", message: "请求超时" })
  })

  it("用户主动取消不打扰用户", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const id = toastError(new Error(JSON.stringify({ $kind: "post-pigeon/error", code: "http.canceled" })))
    expect(id).toBeNull()
    expect(toasts()).toHaveLength(0)
  })

  it("原始错误与主文案不同时留在详情里", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    toastError(new Error("connection refused"), "error.op.sendFailed")
    expect(toasts()[0].detail).toBe("connection refused")
  })
})
