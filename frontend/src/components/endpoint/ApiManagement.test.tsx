import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createSignal, For, type JSX, Show } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { EndpointDetailProps } from "./EndpointDetail"
import type { EndpointTreeProps } from "./EndpointTree"

const mocks = vi.hoisted(() => ({
  get: vi.fn(), save: vi.fn(), create: vi.fn(), send: vi.fn(), cancel: vi.fn(), stop: vi.fn(), connect: vi.fn(), closeWS: vi.fn(), tree: vi.fn(), error: vi.fn(), mounts: vi.fn(),
}))
vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  EndpointService: { GetEndpoint: mocks.get, SaveEndpointData: mocks.save, CreateFullEndpoint: mocks.create, GetInheritedOperationCounts: async () => ({ pre: 0, post: 0 }) },
  HTTPService: { SendRequest: mocks.send, CancelRequest: mocks.cancel, StopStream: mocks.stop },
  WebSocketService: { Connect: mocks.connect, Close: mocks.closeWS },
  ModuleService: { GetModuleBaseURLs: async () => [], GetModuleParams: async () => [] },
  ProjectService: { GetProjectTree: mocks.tree },
  CurlService: {}, EnvironmentService: {}, FolderService: {}, ImportExportService: {},
  SendRequestData: class {},
}))
vi.mock("@/hooks/useI18n", () => ({ t: (key: string) => key }))
vi.mock("@/stores/toast", () => ({ toastError: mocks.error, toastSuccess: vi.fn(), toastWarning: vi.fn() }))
vi.mock("@/stores/app", () => ({
  baseUrlVersion: () => 0, currentEnvironmentIds: () => ({}), getCurrentEnvironmentId: () => "", getProjectEnvironments: () => [],
  notifyBaseUrlsChanged: vi.fn(), projectEnvironments: () => ({}), setCurrentEnvironment: vi.fn(), setProjectEnvironmentsList: vi.fn(), setWebSocketMessageDrafts: vi.fn(),
}))
vi.mock("@/stores/stream", () => ({ clearStream: vi.fn() }))
vi.mock("@/hooks/useRouteCache", () => ({
  useRouteCache: () => ({
    createCachedSignal: (_key: string, initial: unknown) => createSignal(initial),
    loadAll: () => false, autoSaveAll: () => {},
  }),
}))
vi.mock("@/components/endpoint/EndpointTree", () => ({
  EndpointTree: (props: EndpointTreeProps) => <>
    <For each={["A", "B", "C"]}>{id => <button data-testid={`open-${id}`} onClick={() => props.onSelect?.({ id, name: id, type: "endpoint", method: "GET" })}>{id}</button>}</For>
    <button data-testid="new" onClick={() => props.onCreateEndpoint?.("m", "module")}>new</button>
  </>,
}))
vi.mock("@/components/endpoint/EndpointDetail", async () => {
  const { emptyAuth } = await import("./editor-types")
  return { emptyAuth, clearEndpointSessionState: vi.fn(), EndpointDetail: (props: EndpointDetailProps) => {
    mocks.mounts(props.sessionKey)
    const [local, setLocal] = createSignal("")
    return <div data-testid={`editor-${props.endpoint.id}`}>
      <input aria-label="path" value={props.endpoint.path} onInput={e => props.onChange?.({ path: e.currentTarget.value })} />
      <input aria-label="local" value={local()} onInput={e => setLocal(e.currentTarget.value)} />
      <button onClick={() => props.onChange?.({ method: "POST" })}>POST</button>
      <button onClick={() => props.onSave?.()}>save</button>
      <button onClick={() => props.onSend?.()}>send</button>
      <button onClick={() => props.onCancelSend?.()}>cancel-send</button>
      <button onClick={() => props.onWSConnect?.(true)}>connect</button>
      <output data-testid="response">{props.response?.body || "empty"}</output>
      <output data-testid="sending">{String(props.sending)}</output>
      <output data-testid="key">{props.sessionKey}</output>
    </div>
  } }
})
vi.mock("@/components/ui/tabs", () => ({
  Tabs: (props: { tabs: { key: string; label: JSX.Element }[]; value: string; onChange: (id: string) => void; onClose: (id: string) => void; children: (id: string) => JSX.Element }) => <>
    <For each={props.tabs}>{tab => <div data-testid={`tab-${tab.key}`}>
      <button data-testid={`switch-${tab.key}`} onClick={() => props.onChange(tab.key)}>{tab.label}</button>
      <button data-testid={`close-${tab.key}`} onClick={() => props.onClose(tab.key)}>close</button>
    </div>}</For>
    {props.children(props.value)}
  </>,
}))
vi.mock("@/components/ui/dialog", () => ({ Dialog: (props: { open: boolean; children: JSX.Element }) => <Show when={props.open}><div role="dialog">{props.children}</div></Show> }))
vi.mock("@/components/ui/split-pane", () => ({ SplitPane: (props: { left: JSX.Element; right: JSX.Element }) => <>{props.left}{props.right}</> }))
vi.mock("@/components/endpoint/CollectionRunner", () => ({ CollectionRunner: () => null }))
vi.mock("@/components/endpoint/ScopeSettingsDialog", () => ({ ScopeSettingsDialog: () => null }))
vi.mock("@/components/endpoint/FolderTreeSelector", () => ({ FolderTreeSelector: () => null }))
vi.mock("@/components/endpoint/ImportDialogs", () => ({ ApifoxImportDialog: () => null, CurlImportDialog: () => null, OpenAPIImportDialog: () => null, PostmanImportDialog: () => null }))
vi.mock("@/components/endpoint/ImportWizard", () => ({ ImportWizardDialog: () => null }))

import { ApiManagement } from "./ApiManagement"

function endpoint(id: string) {
  return { id, name: id, moduleId: "m", method: "GET", type: "http", path: `/saved-${id}`, bodyType: "none", bodyContent: "", contentType: "", timeout: 30000, params: [], headers: [], bodyFields: [], operations: [], response: null }
}
function response(body: string) {
  return { statusCode: 200, body, size: body.length, headers: {}, contentType: "text/plain", cookies: [], actualRequest: null }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function open(id: string) {
  fireEvent.click(screen.getByTestId(`open-${id}`))
  return await screen.findByTestId(`editor-${id}`)
}
function edit(id: string, path: string) {
  fireEvent.input(within(screen.getByTestId(`editor-${id}`)).getByLabelText("path"), { target: { value: path } })
}
function close(id: string) { fireEvent.click(screen.getByTestId(`close-${id}`)) }
function saveAndClose() { fireEvent.click(screen.getByText("common.saveAndClose")) }
async function start() {
  render(() => <ApiManagement projectId="p" />)
  await waitFor(() => expect(mocks.tree).toHaveBeenCalled())
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockImplementation(async (id: string) => endpoint(id))
  mocks.tree.mockResolvedValue([{ id: "m", name: "Module", endpoints: [endpoint("A"), endpoint("B"), endpoint("C")], folders: [] }])
  mocks.save.mockResolvedValue(undefined)
  mocks.create.mockResolvedValue(endpoint("created"))
  mocks.cancel.mockResolvedValue(true)
  mocks.stop.mockResolvedValue(undefined)
  mocks.closeWS.mockResolvedValue(undefined)
})
afterEach(cleanup)

describe("request workspace data safety", () => {
  it("keeps saved drafts and mounted editor state through A-B-A and repeated tree selection", async () => {
    await start()
    const a = await open("A")
    edit("A", "/edited")
    fireEvent.input(within(a).getByLabelText("local"), { target: { value: "editor state" } })
    await open("B")
    await open("A")
    expect(within(a).getByLabelText("path")).toHaveValue("/edited")
    expect(within(a).getByLabelText("local")).toHaveValue("editor state")
    expect(mocks.get.mock.calls.filter(([id]) => id === "A")).toHaveLength(1)
    expect(mocks.mounts).toHaveBeenCalledTimes(2)
  })

  it("clears dirty when edits return to baseline, and synchronizes saved method labels", async () => {
    await start(); const a = await open("A")
    edit("A", "/edited"); edit("A", "/saved-A")
    close("A")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await open("A")
    fireEvent.click(within(screen.getByTestId("editor-A")).getByText("POST"))
    expect(screen.getByTestId("tab-A")).toHaveTextContent("POST")
    expect(a).not.toBeInTheDocument()
  })

  it("does not close after save failure", async () => {
    await start(); await open("A"); edit("A", "/edited")
    mocks.save.mockRejectedValueOnce(new Error("disk full"))
    close("A"); saveAndClose()
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(screen.getByTestId("tab-A")).toBeInTheDocument()
    expect(within(screen.getByTestId("editor-A")).getByLabelText("path")).toHaveValue("/edited")
  })

  it("saves the background close target instead of the active endpoint", async () => {
    await start(); await open("B"); edit("B", "/edited-B"); await open("A")
    close("B"); saveAndClose()
    await waitFor(() => expect(screen.queryByTestId("tab-B")).not.toBeInTheDocument())
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: "B", path: "/edited-B" }))
    expect(screen.getByTestId("editor-A")).toBeVisible()
  })

  it("retains edits made during an in-flight save", async () => {
    const save = deferred<void>(); mocks.save.mockReturnValueOnce(save.promise)
    await start(); await open("A"); edit("A", "/first"); close("A"); saveAndClose()
    edit("A", "/second"); save.resolve()
    await waitFor(() => expect(mocks.tree).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId("tab-A")).toBeInTheDocument()
    expect(within(screen.getByTestId("editor-A")).getByLabelText("path")).toHaveValue("/second")
  })

  it("keeps late HTTP responses and cancellation scoped to the originating tab", async () => {
    const send = deferred<ReturnType<typeof response>>(); mocks.send.mockReturnValueOnce(send.promise)
    await start(); const a = await open("A")
    fireEvent.click(within(a).getByText("send"))
    const b = await open("B")
    expect(within(b).getByTestId("sending")).toHaveTextContent("false")
    send.resolve(response("response-A"))
    await waitFor(() => expect(within(a).getByTestId("response")).toHaveTextContent("response-A"))
    expect(within(b).getByTestId("response")).toHaveTextContent("empty")
    fireEvent.click(screen.getByTestId("new"))
    expect(screen.getAllByTestId("response").filter(e => e.textContent === "response-A")).toHaveLength(1)
  })

  it("saves and closes a background new request using its own draft", async () => {
    await start(); fireEvent.click(screen.getByTestId("new"))
    const editor = screen.getAllByTestId(/^editor-/)[0]
    const id = editor.dataset.testid!.slice("editor-".length)
    edit(id, "/unsaved-B"); await open("A")
    close(id); saveAndClose()
    fireEvent.input(screen.getByPlaceholderText("GET /users"), { target: { value: "Saved B" } })
    fireEvent.click(screen.getByText("endpoint.save"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(mocks.create).toHaveBeenCalledWith("m", null, expect.objectContaining({ name: "Saved B", path: "/unsaved-B" }))
    expect(screen.queryByTestId("tab-created")).not.toBeInTheDocument()
    expect(screen.getByTestId("editor-A")).toBeVisible()
  })

  it("migrates a new request without remounting or losing its in-flight response", async () => {
    const send = deferred<ReturnType<typeof response>>(); mocks.send.mockReturnValueOnce(send.promise)
    await start(); fireEvent.click(screen.getByTestId("new"))
    const editor = screen.getAllByTestId(/^editor-/)[0]
    fireEvent.input(within(editor).getByLabelText("local"), { target: { value: "keep me" } })
    fireEvent.click(within(editor).getByText("send"))
    fireEvent.click(within(editor).getByText("save"))
    fireEvent.input(screen.getByPlaceholderText("GET /users"), { target: { value: "Saved" } })
    fireEvent.click(screen.getByText("endpoint.save"))
    const saved = await screen.findByTestId("editor-created")
    expect(within(saved).getByLabelText("local")).toHaveValue("keep me")
    send.resolve(response("before-save-response"))
    await waitFor(() => expect(within(saved).getByTestId("response")).toHaveTextContent("before-save-response"))
    expect(mocks.mounts).toHaveBeenCalledTimes(1)
  })

  it("discards a late load after closing and reopening the same endpoint", async () => {
    const old = deferred<ReturnType<typeof endpoint>>()
    mocks.get.mockReturnValueOnce(old.promise)
    await start(); fireEvent.click(screen.getByTestId("open-A")); close("A")
    await open("A")
    old.resolve({ ...endpoint("A"), path: "/stale" })
    await Promise.resolve(); await Promise.resolve()
    expect(within(screen.getByTestId("editor-A")).getByLabelText("path")).toHaveValue("/saved-A")
  })

  it("cancels a closed request and stops a late streaming response", async () => {
    const send = deferred<ReturnType<typeof response> & { streaming: boolean; streamId: string }>()
    mocks.send.mockReturnValueOnce(send.promise)
    await start(); const a = await open("A")
    fireEvent.click(within(a).getByText("send")); close("A")
    expect(mocks.cancel).toHaveBeenCalledWith(expect.any(String))
    send.resolve({ ...response(""), streaming: true, streamId: "late-stream" })
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith("late-stream"))
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
  })
})
