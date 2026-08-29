import { describe, expect, it } from "vitest"

import { convertHTTPToWSProtocol, effectiveWSProtocolConversion, wsUrl } from "./ws-protocol"

describe("WebSocket protocol conversion", () => {
  it("maps http and https to their WebSocket equivalents", () => {
    expect(convertHTTPToWSProtocol("http://example.com/socket", true)).toBe("ws://example.com/socket")
    expect(convertHTTPToWSProtocol("HTTPS://Example.com/socket", true)).toBe("wss://Example.com/socket")
    expect(convertHTTPToWSProtocol("ws://example.com/socket", true)).toBe("ws://example.com/socket")
    expect(convertHTTPToWSProtocol("https://example.com/socket", false)).toBe("https://example.com/socket")
  })

  it("combines base URL and path before conversion", () => {
    expect(wsUrl("https://api.example.com/", "/socket", true)).toBe("wss://api.example.com/socket")
    expect(wsUrl("http://api.example.com", "ws", true)).toBe("ws://api.example.com/ws")
    expect(wsUrl("https://ignored.example.com", "http://direct.example.com/ws", true)).toBe("ws://direct.example.com/ws")
  })

  it("resolves the endpoint mode against its inherited value", () => {
    expect(effectiveWSProtocolConversion("inherit", true)).toBe(true)
    expect(effectiveWSProtocolConversion("inherit", false)).toBe(false)
    expect(effectiveWSProtocolConversion("on", false)).toBe(true)
    expect(effectiveWSProtocolConversion("off", true)).toBe(false)
  })
})
