import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createSignal, Show } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.hoisted(() => vi.fn())
const stream = vi.hoisted(() => ({
  status: "open",
  messages: [] as Array<{ kind: string; data: string; timestamp: number }>,
  selectedMessages: {} as Record<string, { kind: string; data: string; timestamp: number }>,
}))

vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  WebSocketService: { Send: send, SendBinary: send },
}))

vi.mock("@/stores/stream", () => ({
  streamStatus: () => stream.status,
  streamMessages: () => stream.messages,
  clearStreamMessages: vi.fn(),
  selectedStreamMessage: (connId: string) => stream.selectedMessages[connId],
  selectStreamMessage: (connId: string, message?: { kind: string; data: string; timestamp: number }) => {
    if (message) stream.selectedMessages[connId] = message
    else delete stream.selectedMessages[connId]
  },
}))

vi.mock("@/components/ui/code-editor", () => ({
  CodeEditor: (props: { value: string }) => <pre data-testid="code-editor">{props.value}</pre>,
}))

import { setClearWebSocketMessageAfterSend } from "@/stores/app"

import { encodeWebSocketBinary, StreamEventLog, WebSocketMessageEditor, WebSocketResponse } from "./StreamPanels"

function setup(initialValue = "") {
  const [value, setValue] = createSignal(initialValue)
  render(() => <WebSocketMessageEditor connId="ws-editor-test" value={value()} onChange={setValue} />)
  return { value }
}

describe("WebSocketMessageEditor", () => {
  beforeEach(() => {
    // Ark Select 在选择新项后会把选项列表滚到顶部；jsdom 没有实现这个浏览器 API。
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() })
    send.mockReset()
    send.mockResolvedValue(undefined)
    stream.status = "open"
    stream.messages = []
    stream.selectedMessages = {}
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

  it("将十六进制二进制负载转换为 Base64", () => {
    expect(encodeWebSocketBinary("48 69", "hex")).toBe("SGk=")
    expect(() => encodeWebSocketBinary("4", "hex")).toThrow(/十六进制|hexadecimal/i)
  })

  it("点击消息后展开详情，并可切换格式化与原始渲染", () => {
    stream.messages = [{ kind: "message", data: '{"hello":"world"}', timestamp: 1 }]
    render(() => <WebSocketResponse connId="ws-detail-test" />)

    fireEvent.click(screen.getByText(/"hello": "world"/))

    expect(screen.getByText(/消息内容|Message content/)).toBeInTheDocument()
    expect(screen.getByTestId("code-editor")).toHaveTextContent('"hello": "world"')

    fireEvent.click(screen.getByRole("button", { name: /原始|raw/i }))

    expect(screen.getByTestId("code-editor")).toHaveTextContent('{"hello":"world"}')
  })

  it("右侧纵向响应面板将消息详情放在列表下方", () => {
    stream.messages = [{ kind: "message", data: "below", timestamp: 1 }]
    render(() => <WebSocketResponse connId="ws-right-detail-test" layout="right" />)

    fireEvent.click(screen.getByText("below"))

    const detail = screen.getByRole("region", { name: /消息详情|Message details/ })
    expect(detail.parentElement).toHaveClass("flex-col")
    expect(detail).toHaveClass("min-h-48")
  })

  it("切换接口后返回时恢复该接口已展开的消息详情", () => {
    stream.messages = [{ kind: "message", data: "keep-on-switch", timestamp: 1 }]
    const [connId, setConnId] = createSignal("ws-first")
    render(() => (
      <>
        <button type="button" onClick={() => setConnId("ws-second")}>switch endpoint</button>
        <button type="button" onClick={() => setConnId("ws-first")}>switch back</button>
        <WebSocketResponse connId={connId()} />
      </>
    ))

    fireEvent.click(screen.getByText("keep-on-switch"))
    expect(screen.getByRole("region", { name: /消息详情|Message details/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "switch endpoint" }))
    expect(screen.queryByRole("region", { name: /消息详情|Message details/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "switch back" }))
    expect(screen.getByRole("region", { name: /消息详情|Message details/ })).toBeInTheDocument()
  })

  it("切换响应 Tab 导致组件重新挂载后恢复已展开的详情", () => {
    stream.messages = [{ kind: "message", data: "keep-on-remount", timestamp: 1 }]
    const [visible, setVisible] = createSignal(true)
    render(() => (
      <>
        <button type="button" onClick={() => setVisible(false)}>hide response</button>
        <button type="button" onClick={() => setVisible(true)}>show response</button>
        <Show when={visible()}><WebSocketResponse connId="ws-remount-test" /></Show>
      </>
    ))

    fireEvent.click(screen.getByText("keep-on-remount"))
    fireEvent.click(screen.getByRole("button", { name: "hide response" }))
    expect(screen.queryByRole("region", { name: /消息详情|Message details/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "show response" }))
    expect(screen.getByRole("region", { name: /消息详情|Message details/ })).toBeInTheDocument()
  })

  it("自动合并直接展示完成内容，并可切换 Markdown 渲染", async () => {
    stream.messages = [
      { kind: "message", timestamp: 1, data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"先分析"}}]}' },
      { kind: "message", timestamp: 2, data: '{"id":"a","created":1,"model":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"# 合并标题"}}]}' },
    ]
    render(() => <StreamEventLog streamId="http-stream-test" />)

    fireEvent.click(screen.getByLabelText(/流式展示方式|Stream presentation/i))
    fireEvent.click(await screen.findByRole("option", { name: /自动合并|Merged/i }))

    const result = await screen.findByTestId("stream-completion-content")
    expect(result).toHaveTextContent("先分析")
    expect(result).toHaveTextContent("# 合并标题")
    // 合并态不再把合并结果伪装为消息流，因而也不会存在可点开的消息详情。
    expect(screen.queryByRole("region", { name: /消息详情|Message details/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox", { name: /渲染 Markdown|Render Markdown/i }))
    expect(within(result).getByRole("heading", { name: "合并标题" })).toBeInTheDocument()
  })
})
