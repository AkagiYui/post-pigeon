import { describe, expect, it } from "vitest"

import { restoreCachedWebSocketResponse, shouldShowResponsePanel } from "./response-visibility"

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

  it("切回 WebSocket 接口时恢复对应的握手响应以保留响应 Tabs", () => {
    const handshake = { statusCode: 101, headers: { Upgrade: ["websocket"] } }
    const cache = new Map([["ws-endpoint", handshake]])

    expect(restoreCachedWebSocketResponse("ws-endpoint", true, null, cache)).toBe(handshake)
  })

  it("普通接口仍使用自己加载到的响应", () => {
    const handshake = { statusCode: 101 }
    const httpResponse = { statusCode: 200 }
    const cache = new Map([["same-id", handshake]])

    expect(restoreCachedWebSocketResponse("same-id", false, httpResponse, cache)).toBe(httpResponse)
  })
})
