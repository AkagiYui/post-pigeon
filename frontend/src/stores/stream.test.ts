import { afterEach, describe, expect, it } from "vitest"

import { clearStream, clearStreamMessages, markConnecting, streamStatus } from "./stream"

const connId = "stream-clear-test"

afterEach(() => clearStream(connId))

describe("stream clearing", () => {
  it("清空消息时保留当前连接状态", () => {
    markConnecting(connId)

    clearStreamMessages(connId)

    expect(streamStatus(connId)).toBe("connecting")
  })

  it("完整重置仍会清除连接状态", () => {
    markConnecting(connId)

    clearStream(connId)

    expect(streamStatus(connId)).toBe("idle")
  })
})
