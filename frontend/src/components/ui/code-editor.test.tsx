import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setLanguage } from "@/hooks/useI18n"

import { CodeEditor } from "./code-editor"

const mocks = vi.hoisted(() => ({
  copyText: vi.fn(() => Promise.resolve()),
  toastError: vi.fn(),
}))

vi.mock("@/lib/clipboard", () => ({ copyText: mocks.copyText }))
vi.mock("@/stores/toast", () => ({ toastError: mocks.toastError }))

async function openContext(target: Element) {
  fireEvent.contextMenu(target, { clientX: 20, clientY: 20, button: 2 })
  return screen.findByRole("menu")
}

async function selectItem(menu: HTMLElement, name: string | RegExp) {
  const item = within(menu).getByRole("menuitem", { name })
  fireEvent.pointerMove(item, { pointerType: "mouse" })
  fireEvent.click(item)
  await waitFor(() => expect(menu).not.toBeVisible())
}

beforeEach(() => {
  setLanguage("en")
  mocks.copyText.mockClear()
  mocks.toastError.mockClear()
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }),
  })
})

afterEach(() => {
  cleanup()
  setLanguage("zh-CN")
  vi.restoreAllMocks()
  delete (Range.prototype as Partial<Range>).getClientRects
  delete (Range.prototype as Partial<Range>).getBoundingClientRect
})

describe("CodeEditor selection context menu", () => {
  it("selects the full read-only document and copies it", async () => {
    const body = '{\n  "message": "pong"\n}'
    const { container } = render(() => (
      <div class="h-48">
        <CodeEditor value={body} language="json" readOnly selectionContextMenu />
      </div>
    ))
    const content = await waitFor(() => {
      const element = container.querySelector(".cm-content")
      expect(element).toBeInTheDocument()
      return element!
    })

    let menu = await openContext(content)
    expect(within(menu).getByRole("menuitem", { name: /^Copy/ })).toHaveAttribute("aria-disabled", "true")
    await selectItem(menu, /^Select all/)

    menu = await openContext(content)
    expect(within(menu).getByRole("menuitem", { name: /^Copy/ })).not.toHaveAttribute("aria-disabled", "true")
    await selectItem(menu, /^Copy/)
    await waitFor(() => expect(mocks.copyText).toHaveBeenCalledExactlyOnceWith(body))
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it("does not install an application context menu unless requested", () => {
    const { container } = render(() => <CodeEditor value="plain" readOnly />)
    const content = container.querySelector(".cm-content")!
    fireEvent.contextMenu(content, { clientX: 20, clientY: 20, button: 2 })
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
