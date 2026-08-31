import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library"
import { createSignal, type JSX } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type HotkeyConfig, type HotkeyOptions, useHotkey } from "./useHotkey"

function Harness(props: { configs: HotkeyConfig[]; options?: HotkeyOptions; children?: JSX.Element }) {
  useHotkey(props.configs, props.options)
  return <div>{props.children}</div>
}

function press(key: string, modifiers: KeyboardEventInit = {}, target: Node | Window = document) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true, ...modifiers })
  fireEvent(target, event)
  return event
}

beforeEach(() => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel")
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("useHotkey", () => {
  it.each([
    { platform: "MacIntel", primary: { metaKey: true }, secondary: { ctrlKey: true } },
    { platform: "Win32", primary: { ctrlKey: true }, secondary: { metaKey: true } },
  ])("maps CmdOrCtrl to the primary modifier on $platform and rejects extra modifiers", ({ platform, primary, secondary }) => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue(platform)
    const save = vi.fn()
    render(() => <Harness configs={[{ key: "CmdOrCtrl+S", handler: save }]} />)

    const accepted = press("s", primary)
    expect(save).toHaveBeenCalledExactlyOnceWith(accepted)
    expect(accepted.defaultPrevented).toBe(true)
    save.mockClear()
    for (const modifiers of [
      {}, secondary, { ...primary, ...secondary },
      { ...primary, altKey: true }, { ...primary, shiftKey: true },
      { ctrlKey: true, metaKey: true, shiftKey: true, altKey: true },
    ]) {
      expect(press("s", modifiers).defaultPrevented).toBe(false)
    }
    expect(save).not.toHaveBeenCalled()
  })

  it.each(["MacIntel", "Win32"])("keeps explicit Ctrl, Cmd and Meta distinct on %s", (platform) => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue(platform)
    const ctrl = vi.fn()
    const cmd = vi.fn()
    const meta = vi.fn()
    render(() => <Harness configs={[
      { key: "Ctrl+S", handler: ctrl },
      { key: "Cmd+S", handler: cmd },
      { key: "Meta+Enter", handler: meta },
    ]} />)
    press("s", { ctrlKey: true })
    expect(ctrl).toHaveBeenCalledOnce()
    expect(cmd).not.toHaveBeenCalled()
    press("s", { metaKey: true })
    expect(cmd).toHaveBeenCalledOnce()
    expect(ctrl).toHaveBeenCalledOnce()
    press("Enter", { ctrlKey: true })
    expect(meta).not.toHaveBeenCalled()
    press("Enter", { metaKey: true })
    expect(meta).toHaveBeenCalledOnce()
    expect(press("s", { metaKey: true, ctrlKey: true }).defaultPrevented).toBe(false)
    expect(ctrl).toHaveBeenCalledOnce()
    expect(cmd).toHaveBeenCalledOnce()
  })

  it("uses Control for Mac Ctrl+Tab and Ctrl+Shift+Tab, never Command", () => {
    const next = vi.fn()
    const previous = vi.fn()
    render(() => <Harness configs={[
      { key: "Ctrl+Tab", handler: next },
      { key: "Ctrl+Shift+Tab", handler: previous },
    ]} />)
    expect(press("Tab", { metaKey: true }).defaultPrevented).toBe(false)
    expect(press("Tab", { metaKey: true, shiftKey: true }).defaultPrevented).toBe(false)
    expect(press("Tab", { ctrlKey: true, metaKey: true }).defaultPrevented).toBe(false)
    expect(press("Tab", { ctrlKey: true, altKey: true }).defaultPrevented).toBe(false)
    expect(next).not.toHaveBeenCalled()
    expect(previous).not.toHaveBeenCalled()
    expect(press("Tab", { ctrlKey: true }).defaultPrevented).toBe(true)
    expect(next).toHaveBeenCalledOnce()
    expect(previous).not.toHaveBeenCalled()
    press("Tab", { ctrlKey: true, shiftKey: true })
    expect(previous).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
  })

  it.each([
    { binding: "cOnTrOl + oPtIoN + aRrOwLeFt", key: "ArrowLeft", modifiers: { ctrlKey: true, altKey: true } },
    { binding: "Command+ArrowRight", key: "ARROWRIGHT", modifiers: { metaKey: true } },
    { binding: "Meta+PageUp", key: "PageUp", modifiers: { metaKey: true } },
    { binding: "Ctrl+Shift+PageDown", key: "pagedown", modifiers: { ctrlKey: true, shiftKey: true } },
    { binding: "CmdOrCtrl+9", key: "9", modifiers: { metaKey: true } },
    { binding: "Alt+Enter", key: "ENTER", modifiers: { altKey: true } },
    { binding: "Home", key: "Home", modifiers: {} },
  ])("accepts aliases, case-insensitive names and ordinary keys: $binding", ({ binding, key, modifiers }) => {
    const handler = vi.fn()
    render(() => <Harness configs={[{ key: binding, handler }]} />)
    const event = press(key, modifiers)
    expect(handler).toHaveBeenCalledExactlyOnceWith(event)
    expect(event.defaultPrevented).toBe(true)
    expect(press("Unrelated", modifiers).defaultPrevented).toBe(false)
    expect(handler).toHaveBeenCalledOnce()
  })

  it("supports explicitly requiring both Control and Command", () => {
    const handler = vi.fn()
    render(() => <Harness configs={[{ key: "Ctrl+Cmd+1", handler }]} />)
    expect(press("1", { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(press("1", { metaKey: true }).defaultPrevented).toBe(false)
    expect(handler).not.toHaveBeenCalled()
    expect(press("1", { ctrlKey: true, metaKey: true }).defaultPrevented).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
  })

  it("reads hook and binding enabled predicates dynamically without remounting", () => {
    const [scopeEnabled, setScopeEnabled] = createSignal(false)
    const [bindingEnabled, setBindingEnabled] = createSignal(true)
    const handler = vi.fn()
    render(() => <Harness configs={[{ key: "CmdOrCtrl+S", handler, enabled: bindingEnabled }]} options={{ enabled: scopeEnabled }} />)
    expect(press("s", { metaKey: true }).defaultPrevented).toBe(false)
    setScopeEnabled(true)
    expect(press("s", { metaKey: true }).defaultPrevented).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
    setBindingEnabled(false)
    expect(press("s", { metaKey: true }).defaultPrevented).toBe(false)
    setBindingEnabled(true)
    setScopeEnabled(false)
    expect(press("s", { metaKey: true }).defaultPrevented).toBe(false)
    setScopeEnabled(true)
    press("s", { metaKey: true })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it("lets a settings dialog save when the caller disables the workspace scope", () => {
    const workspace = vi.fn()
    const settings = vi.fn()
    render(() => <>
      <Harness configs={[{ key: "CmdOrCtrl+S", allowInInput: true, handler: workspace }]} options={{ enabled: () => false }} />
      <Harness configs={[{ key: "CmdOrCtrl+S", allowInInput: true, handler: settings }]}>
        <div role="dialog" aria-label="Settings"><input aria-label="Project name" /></div>
      </Harness>
    </>)
    expect(press("s", { metaKey: true }, screen.getByRole("textbox")).defaultPrevented).toBe(true)
    expect(settings).toHaveBeenCalledOnce()
    expect(workspace).not.toHaveBeenCalled()
  })

  it("leaves IME and previously consumed events untouched, including in inputs", () => {
    const handler = vi.fn()
    render(() => <Harness configs={[{ key: "CmdOrCtrl+Enter", allowInInput: true, handler }]}>
      <input aria-label="Editor" />
    </Harness>)
    const input = screen.getByRole("textbox")
    expect(press("Enter", { metaKey: true, isComposing: true }, input).defaultPrevented).toBe(false)
    const prevent = (event: Event) => event.preventDefault()
    input.addEventListener("keydown", prevent)
    press("Enter", { metaKey: true }, input)
    expect(handler).not.toHaveBeenCalled()
    input.removeEventListener("keydown", prevent)
    press("Enter", { metaKey: true }, input)
    expect(handler).toHaveBeenCalledOnce()
  })

  it("does not invoke a second registration after the first consumes an event", () => {
    const first = vi.fn()
    const second = vi.fn()
    render(() => <>
      <Harness configs={[{ key: "Ctrl+Tab", handler: first }]} />
      <Harness configs={[{ key: "Ctrl+Tab", handler: second }]} />
    </>)
    press("Tab", { ctrlKey: true })
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  it("preserves the default input/textarea exclusion and the allowInInput override", () => {
    const blocked = vi.fn()
    const allowed = vi.fn()
    render(() => <Harness configs={[
      { key: "CmdOrCtrl+S", handler: blocked },
      { key: "CmdOrCtrl+Enter", handler: allowed, allowInInput: true },
    ]}>
      <input aria-label="Name" />
      <textarea aria-label="Body" />
      <input aria-label="Disabled input" disabled />
    </Harness>)
    for (const input of screen.getAllByRole("textbox")) {
      expect(press("s", { metaKey: true }, input).defaultPrevented).toBe(false)
    }
    expect(blocked).not.toHaveBeenCalled()
    for (const name of ["Name", "Body"]) {
      expect(press("Enter", { metaKey: true }, screen.getByRole("textbox", { name })).defaultPrevented).toBe(true)
    }
    expect(allowed).toHaveBeenCalledTimes(2)
    press("s", { metaKey: true })
    expect(blocked).toHaveBeenCalledOnce()
  })

  it("recognizes contenteditable ancestors and SVG targets, including noneditable islands", () => {
    const blocked = vi.fn()
    const allowed = vi.fn()
    const { container } = render(() => <Harness configs={[
      { key: "CmdOrCtrl+S", handler: blocked },
      { key: "CmdOrCtrl+Enter", handler: allowed, allowInInput: true },
    ]}>
      <div contenteditable="true">
        <span>Editable child</span>
        <svg aria-label="Editable icon"><path d="M0 0" /></svg>
        <div contenteditable="false"><span>Noneditable island</span></div>
      </div>
      <div contenteditable="plaintext-only"><span>Plain text child</span></div>
      <div ref={node => node.setAttribute("contenteditable", "")}><span>Empty attribute child</span></div>
      <svg aria-label="Ordinary icon"><path d="M0 0" /></svg>
    </Harness>)
    const editableIcon = container.querySelector('svg[aria-label="Editable icon"] path')!
    for (const target of [screen.getByText("Editable child"), screen.getByText("Plain text child"), screen.getByText("Empty attribute child"), editableIcon]) {
      expect(press("s", { metaKey: true }, target).defaultPrevented).toBe(false)
      expect(press("Enter", { metaKey: true }, target).defaultPrevented).toBe(true)
    }
    expect(blocked).not.toHaveBeenCalled()
    expect(allowed).toHaveBeenCalledTimes(4)
    expect(press("s", { metaKey: true }, screen.getByText("Noneditable island")).defaultPrevented).toBe(true)
    expect(press("s", { metaKey: true }, container.querySelector('svg[aria-label="Ordinary icon"] path')!).defaultPrevented).toBe(true)
    expect(blocked).toHaveBeenCalledTimes(2)
  })

  it("removes its listener when the Solid owner is disposed", () => {
    const handler = vi.fn()
    const view = render(() => <Harness configs={[{ key: "CmdOrCtrl+S", handler }]} />)
    press("s", { metaKey: true })
    expect(handler).toHaveBeenCalledOnce()
    view.unmount()
    expect(press("s", { metaKey: true }).defaultPrevented).toBe(false)
    expect(handler).toHaveBeenCalledOnce()
  })
})
