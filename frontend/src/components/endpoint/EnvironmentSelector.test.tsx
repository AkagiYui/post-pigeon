import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EnvironmentSelector } from "./EnvironmentSelector"

vi.mock("@/hooks/useI18n", () => ({ t: (key: string, params?: { name: string }) => params ? `${key} ${params.name}` : key }))
const options = [
  { environmentId: "dev", environmentName: "Development", baseUrl: "https://dev.example" },
  { environmentId: "prod", environmentName: "Production", baseUrl: "" },
]
let resize: (width: number) => void
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 32, top: 0, left: 0, bottom: 32, right: 800, x: 0, y: 0, toJSON() {} })
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resize = width => callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver) }
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe("environment selector", () => {
  it("has a noninteractive empty state", () => {
    render(() => <EnvironmentSelector baseUrl="" />)
    expect(screen.getByText("environment.none")).toBeVisible()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("keeps a single environment expandable and editing never selects it", async () => {
    const select = vi.fn(), edit = vi.fn()
    render(() => <EnvironmentSelector baseUrl={options[0].baseUrl} currentEnvironmentId="dev" environmentBaseUrls={[options[0]]} onEnvironmentChange={select} onEditEnvironment={edit} />)
    const trigger = screen.getByRole("button", { name: "environment.select" })
    expect(trigger).toHaveTextContent("https://dev.example")
    fireEvent.click(trigger)
    const menu = await screen.findByRole("menu")
    expect(within(menu).getByRole("menuitemradio")).toHaveAttribute("aria-checked", "true")
    expect(trigger).toHaveAttribute("title", expect.stringContaining("endpoint.baseUrl.hint"))
    const editItem = within(menu).getByRole("menuitem", { name: "environment.editNamed Development" })
    fireEvent.pointerDown(editItem, { pointerType: "mouse", button: 0 })
    await waitFor(() => expect(editItem).toHaveAttribute("data-highlighted"))
    fireEvent.click(editItem)
    await waitFor(() => expect(edit).toHaveBeenCalledExactlyOnceWith("dev"))
    expect(select).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
  })

  it("starts unselected with an icon and permits selection of an empty address", async () => {
    const select = vi.fn()
    render(() => <EnvironmentSelector baseUrl="" environmentBaseUrls={options} onEnvironmentChange={select} />)
    const trigger = screen.getByRole("button", { name: "environment.select" })
    expect(trigger.textContent).toBe("")
    fireEvent.click(trigger)
    const menu = await screen.findByRole("menu")
    const empty = within(menu).getByRole("menuitemradio", { name: /Production/ })
    expect(empty).toHaveTextContent("endpoint.baseUrl.notSet")
    fireEvent.pointerDown(empty, { pointerType: "mouse", button: 0 })
    await waitFor(() => expect(empty).toHaveAttribute("data-highlighted"))
    fireEvent.click(empty)
    await waitFor(() => expect(select).toHaveBeenCalledExactlyOnceWith("prod"))
  })

  it("uses the 540px boundary and WebSocket URL conversion", () => {
    render(() => <EnvironmentSelector baseUrl={options[0].baseUrl} currentEnvironmentId="dev" environmentBaseUrls={options} protocol="websocket" autoConvertWSProtocol />)
    const trigger = screen.getByRole("button", { name: "environment.select" })
    expect(trigger).toHaveTextContent("wss://dev.example")
    resize(540)
    expect(trigger.textContent).toBe("")
    resize(541)
    expect(trigger).toHaveTextContent("wss://dev.example")
  })

  it("opens, selects, and dismisses using the keyboard", async () => {
    const select = vi.fn()
    render(() => <EnvironmentSelector baseUrl="" environmentBaseUrls={options} onEnvironmentChange={select} />)
    const trigger = screen.getByRole("button", { name: "environment.select" })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toHaveAttribute("aria-activedescendant"))
    fireEvent.keyDown(menu, { key: "ArrowDown" })
    fireEvent.keyDown(menu, { key: "Enter" })
    await waitFor(() => expect(select).toHaveBeenCalledWith("prod"))
    fireEvent.click(trigger)
    const reopened = await screen.findByRole("menu")
    await waitFor(() => expect(reopened).toHaveFocus())
    fireEvent.keyDown(reopened, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
  })
})
