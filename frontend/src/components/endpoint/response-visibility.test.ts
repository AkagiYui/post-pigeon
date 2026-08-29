import { describe, expect, it } from "vitest"

import { shouldShowResponsePanel } from "./response-visibility"

describe("response panel visibility", () => {
  it("连接中的 WebSocket 切换回来后即使握手响应未恢复也显示消息面板", () => {
    expect(shouldShowResponsePanel(false, true, "open")).toBe(true)
  })

  it("未请求的普通接口仍显示未请求状态", () => {
    expect(shouldShowResponsePanel(false, false, "idle")).toBe(false)
  })

  it("存在普通响应时显示响应面板", () => {
    expect(shouldShowResponsePanel(true, false, "idle")).toBe(true)
  })
})
