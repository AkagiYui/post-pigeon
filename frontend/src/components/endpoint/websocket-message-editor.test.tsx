import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.hoisted(() => vi.fn())
const stream = vi.hoisted(() => ({ status: "open" }))

vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  WebSocketService: { Send: send },
}))

vi.mock("@/stores/stream", () => ({
  streamStatus: () => stream.status,
  streamMessages: () => [],
  clearStreamMessages: vi.fn(),
}))

import { setClearWebSocketMessageAfterSend } from "@/stores/app"

import { WebSocketMessageEditor } from "./StreamPanels"

function setup(initialValue = "") {
  const [value, setValue] = createSignal(initialValue)
  render(() => <WebSocketMessageEditor connId="ws-editor-test" value={value()} onChange={setValue} />)
  return { value }
}

describe("WebSocketMessageEditor", () => {
  beforeEach(() => {
    send.mockReset()
    send.mockResolvedValue(undefined)
    stream.status = "open"
    setClearWebSocketMessageAfterSend(true)
  })

  afterEach(() => {
    setClearWebSocketMessageAfterSend(true)
  })

  it("保留换行，并用 Ctrl+Enter 发送后清空", async () => {
    const { value } = setup()
    const editor = screen.getByRole("textbox")

    fireEvent.input(editor, { target: { value: "first line\nsecond line" } })
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true })

    await waitFor(() => expect(send).toHaveBeenCalledWith("ws-editor-test", "first line\nsecond line"))
    expect(value()).toBe("")
  })

  it("关闭发送后清空时保留消息", async () => {
    setClearWebSocketMessageAfterSend(false)
    const { value } = setup("keep me")

    fireEvent.click(screen.getByRole("button", { name: /发送|send/i }))

    await waitFor(() => expect(send).toHaveBeenCalledWith("ws-editor-test", "keep me"))
    expect(value()).toBe("keep me")
  })

  it("未连接时仍可编辑草稿，但不能发送", () => {
    stream.status = "idle"
    setup("prepare before connecting")

    expect(screen.getByRole("textbox")).toBeEnabled()
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeDisabled()
  })
})
