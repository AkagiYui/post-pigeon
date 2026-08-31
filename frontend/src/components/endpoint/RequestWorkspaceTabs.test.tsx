import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setLanguage } from "@/hooks/useI18n"

import { RequestWorkspaceTabs, type RequestWorkspaceTabsProps, type WorkspaceTab } from "./RequestWorkspaceTabs"

const tab = (id: string, overrides: Partial<WorkspaceTab> = {}): WorkspaceTab => ({
  id, name: id, path: `/api/${id}`, method: "GET", type: "http",
  state: "resident", dirty: false, saved: true, ...overrides,
})
const initialTabs = () => [
  tab("Pinned", { state: "pinned" }),
  tab("Users", { dirty: true }),
  tab("Events", { state: "preview", saved: false, type: "websocket" }),
  tab("Guide", { type: "doc" }),
]

function setup(tabs = initialTabs(), overrides: Partial<RequestWorkspaceTabsProps> = {}) {
  const [items, setItems] = createSignal(tabs)
  const [value, setValue] = createSignal(tabs[0]?.id ?? "")
  const callbacks = {
    onChange: vi.fn((id: string) => setValue(id)),
    onKeep: vi.fn(), onTogglePin: vi.fn(), onClose: vi.fn(), onCloseOthers: vi.fn(),
    onCloseAll: vi.fn(), onCloseSaved: vi.fn(), onMove: vi.fn(), onNew: vi.fn(), onTitleClick: vi.fn(),
  }
  const rendered = render(() => (
    <div style={{ width: "120px" }}>
      <RequestWorkspaceTabs tabs={items()} value={value()} labelFor={item => item.name} {...callbacks} {...overrides} />
    </div>
  ))
  return { ...rendered, ...callbacks, setItems, setValue }
}

async function openContext(name: string) {
  fireEvent.contextMenu(screen.getByRole("tab", { name }), { clientX: 20, clientY: 20, button: 2 })
  return screen.findByRole("menu")
}

async function selectItem(menu: HTMLElement, name: string | RegExp) {
  const item = within(menu).getByRole("menuitem", { name })
  fireEvent.pointerMove(item, { pointerType: "mouse" })
  fireEvent.click(item)
  await waitFor(() => expect(menu).not.toBeVisible())
}

// 通过实际指针事件路径测试拖动，不手动派发浏览器未必会产生的 dragstart/drop。
function pointer(target: Element | Document, type: string, x: number, y = 20, extra: Partial<PointerEvent> = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  for (const [key, value] of Object.entries({ pointerId: 1, button: 0, clientX: x, clientY: y, isPrimary: true, ...extra })) {
    Object.defineProperty(event, key, { value })
  }
  fireEvent(target, event)
  return event
}

// jsdom 没有布局或 Web Animations；提供实际宽度和当前过渡进度，验证 DOM 重排的衔接。
function measureTabs(widths: Record<string, number>, progress = 1, rtl = false) {
  const records = new Map<string, { slot: HTMLElement; row: HTMLElement; animate: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }>()
  for (const list of document.querySelectorAll<HTMLElement>('[role="tablist"]')) {
    const width = Object.values(widths).reduce((sum, item) => sum + item, 0)
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue({ left: 0, right: width, top: 0, bottom: 44, width, height: 44 } as DOMRect)
  }
  for (const slot of document.querySelectorAll<HTMLElement>("[data-workspace-tab-slot]")) {
    const id = slot.dataset.workspaceTabSlot!
    const row = slot.firstElementChild as HTMLElement
    slot.style.direction = rtl ? "rtl" : "ltr"
    row.style.opacity = "1"
    const rect = () => {
      const ids = [...document.querySelectorAll<HTMLElement>("[data-workspace-tab-slot]")].map(node => node.dataset.workspaceTabSlot!)
      const preceding = ids.slice(0, ids.indexOf(id)).reduce((sum, key) => sum + widths[key], 0)
      const left = rtl ? Object.values(widths).reduce((sum, width) => sum + width, 0) - preceding - widths[id] : preceding
      return { left, right: left + widths[id], width: widths[id], top: 0, bottom: 44, height: 44 } as DOMRect
    }
    vi.spyOn(slot, "getBoundingClientRect").mockImplementation(rect)
    vi.spyOn(row, "getBoundingClientRect").mockImplementation(() => {
      const bounds = rect()
      const offset = Number(row.style.transform.match(/translateX\(([-\d.]+)px\)/)?.[1] ?? 0) * progress
      return { ...bounds, left: bounds.left + offset, right: bounds.right + offset } as DOMRect
    })
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel, onfinish: null }))
    Object.defineProperty(row, "animate", { configurable: true, value: animate })
    records.set(id, { slot, row, animate, cancel })
  }
  return records
}

function middleClick(element: Element) {
  fireEvent.mouseDown(element, { button: 1 })
  fireEvent.mouseUp(element, { button: 1 })
  fireEvent(element, new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))
}

let scrollIntoView: ReturnType<typeof vi.fn>
beforeEach(() => {
  setLanguage("en")
  scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  setLanguage("zh-CN")
  vi.restoreAllMocks()
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
})

describe("RequestWorkspaceTabs", () => {
  it("renders only a compact toolbar, full titles, type badges, and separate unsaved/preview semantics", () => {
    const { container } = setup([
      ...initialTabs(), tab("Draft", { saved: false }), tab("Stream", { method: "SSE" }),
      tab("Custom", { method: "PROPFIND" }),
    ], { labelFor: item => `${item.name} label` })
    const tablist = screen.getByRole("tablist", { name: "Request workspace tabs" })
    expect(tablist).toHaveAttribute("aria-orientation", "horizontal")
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
    expect(container.querySelector("button button")).toBeNull()
    expect(tablist.parentElement).toHaveClass("h-11", "min-w-0")
    expect(tablist).toHaveClass("min-w-0", "overflow-x-auto")
    const preview = screen.getByRole("tab", { name: "Events label" })
    const emphasis = within(preview).getByText("Events label").closest("em")!
    expect(emphasis).toHaveClass("italic")
    expect(within(emphasis).getByText("WS")).toBeInTheDocument()
    expect(within(preview).getByRole("img", { name: "Not saved yet" })).toBeInTheDocument()
    expect(within(preview).getByText("WS")).toBeInTheDocument()
    expect(preview.title).toContain("Events")
    expect(preview.title).toContain("/api/Events")
    expect(preview.title).toContain("Events label")
    expect(preview.title).toContain("Preview")
    expect(within(screen.getByRole("tab", { name: "Users label" })).getByRole("img", { name: "Unsaved changes" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Draft label" }).querySelector("em")).toBeNull()
    expect(within(screen.getByRole("tab", { name: "Draft label" })).getByRole("img", { name: "Not saved yet" })).toBeInTheDocument()
    expect(within(screen.getByRole("tab", { name: "Guide label" })).getByText("DOC")).toBeInTheDocument()
    expect(within(screen.getByRole("tab", { name: "Stream label" })).getByText("SSE")).toBeInTheDocument()
    expect(within(screen.getByRole("tab", { name: "Custom label" })).getByText("PROPFIND")).toBeInTheDocument()
    const pinned = screen.getByRole("tab", { name: "Pinned label" })
    expect(within(pinned).queryByRole("img")).toBeNull()
    expect(pinned.parentElement).toHaveClass("border-t-2", "border-t-accent", "bg-surface", "rounded-none", "min-w-[92px]", "max-w-[202px]")
    expect(tablist.parentElement).toHaveClass("bg-surface-alt")
    expect(container.querySelector('[class*="primary"], .bg-background')).toBeNull()
    expect(screen.queryByRole("button", { name: "Close Pinned label" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close Users label" })).toHaveClass("opacity-0", "group-hover:opacity-100", "group-focus-within:opacity-100")
  })

  it("routes selection, title clicks, keep, close, pin and new actions independently", () => {
    vi.useFakeTimers()
    const actions = setup()
    fireEvent.click(screen.getByText("Users"))
    expect(actions.onChange).toHaveBeenLastCalledWith("Users")
    vi.advanceTimersByTime(150)
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Users"), { detail: 1 })
    vi.advanceTimersByTime(149)
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(actions.onTitleClick).toHaveBeenCalledExactlyOnceWith("Users")
    expect(screen.getByRole("tab", { name: "Users" })).toHaveAttribute("aria-selected", "true")
    actions.onChange.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Close Users" }))
    expect(actions.onClose).toHaveBeenCalledExactlyOnceWith("Users")
    fireEvent.click(screen.getByRole("button", { name: "Unpin Pinned" }))
    expect(actions.onTogglePin).toHaveBeenCalledExactlyOnceWith("Pinned")
    fireEvent.dblClick(screen.getByText("Events"))
    expect(actions.onKeep).toHaveBeenCalledExactlyOnceWith("Events")
    fireEvent.click(screen.getByRole("button", { name: "New request" }))
    expect(actions.onNew).toHaveBeenCalledOnce()
    expect(actions.onChange).not.toHaveBeenCalled()
    expect(actions.onTitleClick).toHaveBeenCalledTimes(1)
  })

  it("middle-click explicitly closes ordinary, preview and pinned tabs", () => {
    const actions = setup()
    middleClick(screen.getByRole("tab", { name: "Users" }))
    middleClick(screen.getByText("Events"))
    middleClick(screen.getByRole("tab", { name: "Pinned" }))
    expect(actions.onClose.mock.calls).toEqual([["Users"], ["Events"], ["Pinned"]])
    expect(actions.onChange).not.toHaveBeenCalled()
    expect(actions.onTogglePin).not.toHaveBeenCalled()
  })

  it("updates pinned/dirty/preview presentation from controlled tab data without conflating the indicators", () => {
    const actions = setup([tab("Request", { state: "preview", saved: false })])
    actions.setItems([tab("Request", { state: "pinned", dirty: true })])
    let request = screen.getByRole("tab", { name: "Request" })
    expect(request.querySelector("em")).toBeNull()
    expect(within(request).getByRole("img", { name: "Unsaved changes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unpin Request" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Close Request" })).not.toBeInTheDocument()
    middleClick(request)
    expect(actions.onClose).toHaveBeenCalledExactlyOnceWith("Request")
    actions.onClose.mockClear()
    actions.setItems([tab("Request")])
    request = screen.getByRole("tab", { name: "Request" })
    expect(within(request).queryByRole("img")).not.toBeInTheDocument()
    middleClick(screen.getByRole("button", { name: "Close Request" }))
    expect(actions.onClose).toHaveBeenCalledExactlyOnceWith("Request")
  })

  it("cancels title location for a real double-click sequence and keeps the preview once", () => {
    vi.useFakeTimers()
    const actions = setup()
    actions.setValue("Events")
    const title = screen.getByText("Events")
    fireEvent.click(title, { detail: 1 })
    vi.advanceTimersByTime(80)
    fireEvent.click(title, { detail: 2 })
    fireEvent.dblClick(title, { detail: 2 })
    vi.advanceTimersByTime(200)
    expect(actions.onKeep).toHaveBeenCalledExactlyOnceWith("Events")
    expect(actions.onTitleClick).not.toHaveBeenCalled()
  })

  it("cleans up delayed title location on selection change, tab removal, and disposal", () => {
    vi.useFakeTimers()
    const actions = setup()
    fireEvent.click(screen.getByText("Pinned"), { detail: 1 })
    actions.setValue("Users")
    vi.advanceTimersByTime(200)
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Users"), { detail: 1 })
    actions.setItems(initialTabs().filter(item => item.id !== "Users"))
    vi.advanceTimersByTime(200)
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    actions.setValue("Pinned")
    fireEvent.click(screen.getByText("Pinned"), { detail: 1 })
    actions.unmount()
    vi.advanceTimersByTime(200)
    expect(actions.onTitleClick).not.toHaveBeenCalled()
  })

  it("preserves the focused button while immutable tab objects, titles and state change", () => {
    const actions = setup()
    actions.setValue("Users")
    const original = screen.getByRole("tab", { name: "Users" })
    original.focus()
    const next = initialTabs().map(item => item.id === "Users"
      ? { ...item, name: "People", path: "/people", method: "POST", state: "preview" as const }
      : { ...item })
    actions.setItems(next)
    const updated = screen.getByRole("tab", { name: "People" })
    expect(updated).toBe(original)
    expect(updated).toHaveFocus()
    expect(updated.title).toContain("/people")
    expect(updated.querySelector("em")).toHaveTextContent("POSTPeople")
    actions.setItems(next.map(item => ({ ...item, state: "pinned", dirty: false })))
    expect(screen.getByRole("tab", { name: "People" })).toBe(original)
    expect(original).toHaveFocus()
    expect(original.querySelector("em")).toBeNull()
    expect(within(original).queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unpin People" })).toBeInTheDocument()
    fireEvent.click(original)
    expect(actions.onChange).toHaveBeenLastCalledWith("Users")
    actions.setItems([...next].reverse())
    expect(screen.getByRole("tab", { name: "People" })).toBe(original)
  })

  it("links stable prefixed tab IDs to owner-rendered panels without collisions between workspaces", () => {
    const actions = setup([tab("request/one")], { tabIdPrefix: "workspace-a" })
    const first = screen.getByRole("tab", { name: "request/one" })
    render(() => <section role="tabpanel" id="workspace-a-panel-request%2Fone" aria-labelledby="workspace-a-tab-request%2Fone">Details</section>)
    expect(first.id).toBe("workspace-a-tab-request%2Fone")
    const panel = screen.getByRole("tabpanel", { name: "request/one" })
    expect(document.getElementById(first.getAttribute("aria-controls")!)).toBe(panel)
    setup([tab("request/one")], { tabIdPrefix: "workspace-b" })
    const ids = screen.getAllByRole("tab").map(item => item.id)
    expect(new Set(ids).size).toBe(2)
    actions.setItems([tab("request/one", { dirty: true, name: "Renamed" })])
    expect(screen.getByRole("tab", { name: "Renamed" })).toBe(first)
    expect(first.id).toBe("workspace-a-tab-request%2Fone")
    expect(panel).toHaveAccessibleName("Renamed")
  })

  it("uses roving focus, wraps arrow navigation, and supports Home/End without firing title callbacks", () => {
    const actions = setup()
    const pinned = screen.getByRole("tab", { name: "Pinned" })
    pinned.focus()
    fireEvent.keyDown(pinned, { key: "ArrowRight" })
    const users = screen.getByRole("tab", { name: "Users" })
    expect(users).toHaveFocus()
    expect(users).toHaveAttribute("tabindex", "0")
    expect(pinned).toHaveAttribute("tabindex", "-1")
    fireEvent.keyDown(users, { key: "End" })
    const guide = screen.getByRole("tab", { name: "Guide" })
    expect(guide).toHaveFocus()
    fireEvent.keyDown(guide, { key: "ArrowRight" })
    expect(pinned).toHaveFocus()
    fireEvent.keyDown(pinned, { key: "ArrowLeft" })
    expect(guide).toHaveFocus()
    fireEvent.keyDown(guide, { key: "Home" })
    expect(pinned).toHaveFocus()
    expect(screen.getAllByRole("tab").filter(item => item.tabIndex === 0)).toEqual([pinned])
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    actions.onChange.mockClear()
    fireEvent.keyDown(pinned, { key: "ArrowRight", ctrlKey: true })
    fireEvent.keyDown(pinned, { key: "ArrowDown" })
    expect(actions.onChange).not.toHaveBeenCalled()
  })

  it("reverses horizontal arrows for RTL and keeps a focus entry if the active tab is removed", () => {
    const actions = setup()
    const pinned = screen.getByRole("tab", { name: "Pinned" })
    screen.getByRole("tablist").style.direction = "rtl"
    fireEvent.keyDown(pinned, { key: "ArrowRight" })
    expect(screen.getByRole("tab", { name: "Guide" })).toHaveFocus()
    actions.setValue("removed")
    expect(pinned).toHaveAttribute("tabindex", "0")
    expect(screen.getAllByRole("tab").filter(item => item.tabIndex === 0)).toHaveLength(1)
  })

  it("reveals the active tab after a controlled value change and tab insertion", async () => {
    const actions = setup()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    scrollIntoView.mockClear()
    actions.setValue("Guide")
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "nearest", inline: "nearest" }))
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("tab", { name: "Guide" }))
    scrollIntoView.mockClear()
    actions.setValue("Added")
    actions.setItems([...initialTabs(), tab("Added")])
    await waitFor(() => expect(scrollIntoView.mock.contexts).toContain(screen.getByRole("tab", { name: "Added" })))
  })

  it("routes right-click actions to the clicked inactive tab, not the active tab", async () => {
    const actions = setup()
    await selectItem(await openContext("Users"), /^Close tab/)
    expect(actions.onClose).toHaveBeenCalledExactlyOnceWith("Users")
    await selectItem(await openContext("Users"), "Close other unpinned tabs")
    expect(actions.onCloseOthers).toHaveBeenCalledExactlyOnceWith("Users")
    await selectItem(await openContext("Users"), "Close all unpinned tabs")
    expect(actions.onCloseAll).toHaveBeenCalledOnce()
    await selectItem(await openContext("Users"), "Close saved tabs")
    expect(actions.onCloseSaved).toHaveBeenCalledOnce()
    await selectItem(await openContext("Users"), "Pin tab")
    expect(actions.onTogglePin).toHaveBeenCalledExactlyOnceWith("Users")
    const menu = await openContext("Events")
    expect(within(menu).getAllByRole("menuitem").map(item => item.textContent)).toEqual([
      "Pin tab", `Close tab${/mac/i.test(navigator.platform) ? "⌘" : "Ctrl"}+W`, "Close saved tabs", "Close other unpinned tabs", "Close all unpinned tabs",
    ])
    expect(actions.onChange).not.toHaveBeenCalled()
  })

  it("allows explicit context close of a pinned tab but disables batches without unpinned candidates", async () => {
    const actions = setup([tab("Pinned", { state: "pinned" }), tab("Other pin", { state: "pinned" })])
    const menu = await openContext("Pinned")
    for (const name of ["Close saved tabs", "Close other unpinned tabs", "Close all unpinned tabs"]) {
      const item = within(menu).getByRole("menuitem", { name })
      expect(item).toHaveAttribute("aria-disabled", "true")
      fireEvent.click(item)
    }
    expect(actions.onClose).not.toHaveBeenCalled()
    expect(actions.onCloseOthers).not.toHaveBeenCalled()
    expect(actions.onCloseAll).not.toHaveBeenCalled()
    expect(actions.onCloseSaved).not.toHaveBeenCalled()
    await selectItem(menu, /^Close tab/)
    expect(actions.onClose).toHaveBeenCalledExactlyOnceWith("Pinned")
    await selectItem(await openContext("Pinned"), "Unpin tab")
    expect(actions.onTogglePin).toHaveBeenCalledExactlyOnceWith("Pinned")
  })

  it("lists every tab in the overflow menu and provides navigation and batch actions", async () => {
    const actions = setup()
    const more = screen.getByRole("button", { name: "All tabs and tab actions" })
    fireEvent.click(more)
    let menu = await screen.findByRole("menu")
    for (const item of initialTabs()) {
      expect(within(menu).getByRole("menuitem", { name: new RegExp(`/api/${item.id}`) })).toBeInTheDocument()
    }
    await selectItem(menu, /\/api\/Guide/)
    expect(actions.onChange).toHaveBeenCalledExactlyOnceWith("Guide")
    expect(actions.onTitleClick).not.toHaveBeenCalled()
    expect(screen.getByRole("tab", { name: "Guide" })).toHaveAttribute("aria-selected", "true")
    fireEvent.click(more)
    menu = await screen.findByRole("menu")
    await selectItem(menu, "Close other unpinned tabs")
    expect(actions.onCloseOthers).toHaveBeenCalledExactlyOnceWith("Guide")
    fireEvent.click(more)
    await selectItem(await screen.findByRole("menu"), "Close all unpinned tabs")
    expect(actions.onCloseAll).toHaveBeenCalledOnce()
    fireEvent.click(more)
    await selectItem(await screen.findByRole("menu"), "Close saved tabs")
    expect(actions.onCloseSaved).toHaveBeenCalledOnce()
  })

  it("disables close-saved for drafts and dirty saved tabs, then enables it when changes are saved", async () => {
    const actions = setup([tab("Dirty", { dirty: true }), tab("Draft", { saved: false })])
    const more = screen.getByRole("button", { name: "All tabs and tab actions" })
    fireEvent.click(more)
    const menu = await screen.findByRole("menu")
    const item = within(menu).getByRole("menuitem", { name: "Close saved tabs" })
    expect(item).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(item)
    expect(actions.onCloseSaved).not.toHaveBeenCalled()
    actions.setItems([tab("Dirty"), tab("Draft", { saved: false })])
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "Close saved tabs" })).not.toHaveAttribute("aria-disabled", "true"))
    await selectItem(menu, "Close saved tabs")
    expect(actions.onCloseSaved).toHaveBeenCalledOnce()
  })

  it("opens and navigates overflow with the keyboard and returns focus to its native trigger", async () => {
    const actions = setup()
    const more = screen.getByRole("button", { name: "All tabs and tab actions" })
    expect(more.tagName).toBe("BUTTON")
    expect(more).toHaveAttribute("aria-haspopup", "menu")
    more.focus()
    fireEvent.keyDown(more, { key: "ArrowDown" })
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toHaveFocus())
    expect(more).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(menu, { key: "ArrowDown" })
    fireEvent.keyDown(menu, { key: "Enter" })
    await waitFor(() => expect(actions.onChange).toHaveBeenCalledExactlyOnceWith("Users"))
    await waitFor(() => expect(more).toHaveFocus())
    expect(more).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps new/overflow usable with no tabs and updates translations reactively", async () => {
    const actions = setup([])
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "New request" }))
    expect(actions.onNew).toHaveBeenCalledOnce()
    actions.setItems([tab("说明", { type: "doc", saved: false, state: "preview" })])
    setLanguage("zh-CN")
    expect(screen.getByRole("tablist", { name: "接口工作区标签栏" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新建请求" })).toBeInTheDocument()
    const preview = screen.getByRole("tab", { name: "说明" })
    expect(within(preview).getByText("文档")).toBeInTheDocument()
    expect(within(preview).getByRole("img", { name: "尚未保存" })).toBeInTheDocument()
    fireEvent.dblClick(within(preview).getByText("说明"))
    expect(actions.onKeep).toHaveBeenCalledExactlyOnceWith("说明")
  })

  it("starts only after the movement threshold and commits within the same pin group", () => {
    const actions = setup([tab("Pin A", { state: "pinned" }), tab("Pin B", { state: "pinned" }), tab("A"), tab("B", { state: "preview" })])
    measureTabs({ "Pin A": 100, "Pin B": 100, A: 100, B: 100 })
    const source = screen.getByRole("tab", { name: "A" })
    pointer(source, "pointerdown", 220)
    expect(pointer(document, "pointermove", 223).defaultPrevented).toBe(false)
    expect(source.parentElement).not.toHaveAttribute("data-dragging")
    expect(pointer(document, "pointermove", 350).defaultPrevented).toBe(true)
    expect(actions.onMove).not.toHaveBeenCalled()
    pointer(document, "pointerup", 350)
    expect(actions.onMove).toHaveBeenCalledExactlyOnceWith("A", "B")
    fireEvent.click(source, { detail: 1 })
    expect(actions.onChange).not.toHaveBeenCalled()
    pointer(source, "pointerdown", 220)
    pointer(document, "pointermove", 50)
    pointer(document, "pointerup", 50)
    expect(actions.onMove).toHaveBeenCalledTimes(1)
    const pinned = screen.getByRole("tab", { name: "Pin A" })
    pointer(pinned, "pointerdown", 20)
    pointer(document, "pointermove", 150)
    pointer(document, "pointerup", 150)
    expect(actions.onMove).toHaveBeenLastCalledWith("Pin A", "Pin B")
  })

  it.each([false, true])("previews variable-width gaps on stable hit targets and animates cancellation (RTL=%s)", (rtl) => {
    const actions = setup([tab("Pin", { state: "pinned" }), tab("A"), tab("B"), tab("C")])
    const measured = measureTabs({ Pin: 70, A: 120, B: 80, C: 160 }, 1, rtl)
    const source = screen.getByRole("tab", { name: "A" })
    const direction = rtl ? -1 : 1
    const row = (id: string) => measured.get(id)!.row
    const originalLeft = measured.get("B")!.slot.getBoundingClientRect().left
    const sourceX = measured.get("A")!.slot.getBoundingClientRect().left + 20
    const targetX = measured.get("C")!.slot.getBoundingClientRect().left + 20
    pointer(source, "pointerdown", sourceX)
    pointer(document, "pointermove", targetX)
    expect(row("A")).toHaveAttribute("data-dragging", "true")
    expect(row("A").style.transform).toBe(`translateX(${direction * 240}px)`)
    expect(row("B").style.transform).toBe(`translateX(${direction * -120}px)`)
    expect(row("C").style.transform).toBe(`translateX(${direction * -120}px)`)
    expect(row("Pin").style.transform).toBe("translateX(0px)")
    expect(measured.get("B")!.slot.getBoundingClientRect().left).toBe(originalLeft)
    expect(measured.get("C")!.slot.querySelector("[data-drop-indicator]")).toHaveClass("end-0")
    expect(actions.onMove).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(row("A")).not.toHaveAttribute("data-dragging")
    expect(row("A").style.transform).toBe("translateX(0px)")
    expect(document.querySelector("[data-drop-indicator]")).toBeNull()
    expect(measured.get("A")!.animate).toHaveBeenCalledWith([
      { transform: `translateX(${direction * 240}px)`, opacity: "1" },
      { transform: "translateX(0px)", opacity: "1" },
    ], expect.objectContaining({ duration: 180 }))
    pointer(document, "pointerup", targetX)
    expect(actions.onMove).not.toHaveBeenCalled()
    actions.unmount()
    expect(measured.get("A")!.cancel).toHaveBeenCalledOnce()
  })

  it.each([false, true])("commits a fast drop from the current visual position without remounting (reduced motion=%s)", (reduce) => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: reduce })
    const items = [tab("A"), tab("B"), tab("C")]
    const actions = setup(items)
    actions.onMove.mockImplementation(() => actions.setItems([items[1], items[2], items[0]]))
    const measured = measureTabs({ A: 100, B: 140, C: 80 }, 0.5)
    const source = screen.getByRole("tab", { name: "A" })
    pointer(source, "pointerdown", 20)
    pointer(document, "pointermove", 270)
    pointer(document, "pointerup", 270)
    expect(actions.onMove).toHaveBeenCalledExactlyOnceWith("A", "C")
    expect(screen.getAllByRole("tab").map(node => node.getAttribute("aria-label"))).toEqual(["B", "C", "A"])
    expect(screen.getByRole("tab", { name: "A" })).toBe(source)
    const a = measured.get("A")!
    expect(a.row).toHaveClass("motion-reduce:transition-none")
    expect(a.row.style.transform).toBe("translateX(0px)")
    if (reduce) expect(a.animate).not.toHaveBeenCalled()
    else expect(a.animate).toHaveBeenCalledWith([
      { transform: "translateX(-110px)", opacity: "1" },
      { transform: "translateX(0px)", opacity: "1" },
    ], expect.objectContaining({ duration: 180 }))
    pointer(document, "pointerup", 270)
    expect(a.animate).toHaveBeenCalledTimes(reduce ? 0 : 1)
    expect(document.querySelector("[data-drop-indicator]")).toBeNull()
  })

  it("captures a stable outer element and releases it even though visual contents ignore pointer hits", () => {
    const actions = setup([tab("A"), tab("B")])
    const measured = measureTabs({ A: 100, B: 140 })
    const source = screen.getByRole("tab", { name: "A" })
    const { slot, row } = measured.get("A")!
    const capture = vi.fn()
    const release = vi.fn()
    Object.defineProperties(slot, {
      setPointerCapture: { value: capture, configurable: true },
      hasPointerCapture: { value: () => true, configurable: true },
      releasePointerCapture: { value: release, configurable: true },
    })
    pointer(source, "pointerdown", 20)
    expect(capture).not.toHaveBeenCalled()
    pointer(document, "pointermove", 150)
    expect(capture).toHaveBeenCalledWith(1)
    expect(row).toHaveClass("pointer-events-none")
    expect(slot.closest(".pointer-events-none")).toBeNull()
    expect(slot.style.transform).toBe("")
    // 捕获后 pointerup 的目标仍是原槽位，必须用坐标而不是 event.target 决定落点。
    pointer(slot, "pointerup", 150)
    expect(actions.onMove).toHaveBeenCalledExactlyOnceWith("A", "B")
    expect(release).toHaveBeenCalledWith(1)
  })

  it("preserves clicks, middle/right buttons and controls; ignores other pointers and external drops", () => {
    const actions = setup([tab("A"), tab("B", { state: "pinned" })])
    measureTabs({ A: 100, B: 100 })
    const source = screen.getByRole("tab", { name: "A" })
    for (const control of [screen.getByRole("button", { name: "Close A" }), screen.getByRole("button", { name: "Unpin B" })]) {
      pointer(control, "pointerdown", 20)
      expect(pointer(document, "pointermove", 150).defaultPrevented).toBe(false)
    }
    for (const button of [1, 2]) {
      pointer(source, "pointerdown", 20, 20, { button })
      expect(pointer(document, "pointermove", 150).defaultPrevented).toBe(false)
    }
    pointer(source, "pointerdown", 20)
    expect(pointer(document, "pointermove", 150, 20, { pointerId: 2 }).defaultPrevented).toBe(false)
    pointer(document, "pointerup", 22)
    fireEvent.click(source, { detail: 1 })
    expect(actions.onChange).toHaveBeenCalledExactlyOnceWith("A")
    const external = new Event("drop", { bubbles: true, cancelable: true })
    fireEvent(source, external)
    expect(external.defaultPrevented).toBe(false)
    expect(actions.onMove).not.toHaveBeenCalled()
  })

  it.each(["outside", "cancel", "blur", "removed", "regrouped", "unmount"])("cancels safely when the gesture ends via %s", (reason) => {
    const actions = setup([tab("A"), tab("B")])
    measureTabs({ A: 100, B: 100 })
    const source = screen.getByRole("tab", { name: "A" })
    pointer(source, "pointerdown", 20)
    pointer(document, "pointermove", 150)
    if (reason === "outside") pointer(document, "pointerup", 250)
    if (reason === "cancel") pointer(document, "pointercancel", 150)
    if (reason === "blur") fireEvent(window, new Event("blur"))
    if (reason === "removed") actions.setItems([tab("B")])
    if (reason === "regrouped") actions.setItems([tab("A"), tab("B", { state: "pinned" })])
    if (reason === "unmount") actions.unmount()
    pointer(document, "pointerup", 150)
    expect(actions.onMove).not.toHaveBeenCalled()
    expect(document.querySelector("[data-dragging]")).toBeNull()
    expect(document.querySelector("[data-drop-indicator]")).toBeNull()
    expect(pointer(document, "pointermove", 150).defaultPrevented).toBe(false)
  })

  it("does not start a stale gesture after its source is removed before the threshold", () => {
    const actions = setup([tab("A"), tab("B")])
    measureTabs({ A: 100, B: 100 })
    pointer(screen.getByRole("tab", { name: "A" }), "pointerdown", 20)
    actions.setItems([tab("B")])
    pointer(document, "pointermove", 150)
    pointer(document, "pointerup", 150)
    expect(actions.onMove).not.toHaveBeenCalled()
  })
})
