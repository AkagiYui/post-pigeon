import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { createSignal, For, type JSX, Show } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setCurrentEnvironment } from "@/stores/app"

import type { EndpointDetailProps } from "./EndpointDetail"
import type { EndpointTreeProps } from "./EndpointTree"
import type { RequestWorkspaceTabsProps } from "./RequestWorkspaceTabs"

const mocks = vi.hoisted(() => ({
  get: vi.fn(), save: vi.fn(), create: vi.fn(), send: vi.fn(), cancel: vi.fn(), stop: vi.fn(), connect: vi.fn(), closeWS: vi.fn(), tree: vi.fn(), error: vi.fn(), mounts: vi.fn(),
  urls: vi.fn(), curl: vi.fn(),
}))
vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  EndpointService: { GetEndpoint: mocks.get, SaveEndpointData: mocks.save, CreateFullEndpoint: mocks.create, GetInheritedOperationCounts: async () => ({ pre: 0, post: 0 }) },
  HTTPService: { SendRequest: mocks.send, CancelRequest: mocks.cancel, StopStream: mocks.stop },
  WebSocketService: { Connect: mocks.connect, Close: mocks.closeWS },
  ModuleService: { ResolveEnvironmentBaseURLs: mocks.urls, GetModuleParams: async () => [] },
  ProjectService: { GetProjectTree: mocks.tree },
  CurlService: { ToCurl: mocks.curl }, EnvironmentService: {}, FolderService: {}, ImportExportService: {},
  SendRequestData: class {},
}))
vi.mock("@/hooks/useI18n", () => ({ t: (key: string) => key }))
vi.mock("@/stores/toast", () => ({ toastError: mocks.error, toastSuccess: vi.fn(), toastWarning: vi.fn() }))
vi.mock("@/stores/app", async () => {
  const { createSignal } = await import("solid-js")
  const [environment, setEnvironment] = createSignal("dev")
  const environments = [{ id: "dev", name: "Dev" }, { id: "prod", name: "Prod" }, { id: "stage", name: "Stage" }]
  return {
    baseUrlVersion: () => 0, currentEnvironmentIds: () => ({ p: environment() }), getCurrentEnvironmentId: environment, getProjectEnvironments: () => environments,
    notifyBaseUrlsChanged: vi.fn(), projectEnvironments: () => ({}), setCurrentEnvironment: (_project: string, id: string) => setEnvironment(id), setProjectEnvironmentsList: vi.fn(), setWebSocketMessageDrafts: vi.fn(),
  }
})
vi.mock("@/lib/clipboard", () => ({ copyText: vi.fn() }))
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
      <button onClick={() => props.onChange?.({ serverId: "users" })}>users-service</button>
      <button onClick={() => props.onSave?.()}>save</button>
      <button onClick={() => props.onSend?.()}>send</button>
      <button onClick={() => props.onCancelSend?.()}>cancel-send</button>
      <button onClick={() => props.onWSConnect?.(true).catch(mocks.error)}>connect</button>
      <button onClick={() => props.onCopyAsCurl?.()}>curl</button>
      <button onClick={() => props.onEnvironmentChange?.("prod")}>prod</button>
      <output data-testid="base-url">{props.endpoint.baseUrl}</output>
      <output data-testid="response">{props.response?.body || "empty"}</output>
      <output data-testid="sending">{String(props.sending)}</output>
      <output data-testid="key">{props.sessionKey}</output>
    </div>
  } }
})
vi.mock("@/components/endpoint/RequestWorkspaceTabs", () => ({
  RequestWorkspaceTabs: (props: RequestWorkspaceTabsProps) => <>
    <For each={props.tabs}>{tab => <div data-testid={`tab-${tab.id}`} data-state={tab.state} data-dirty={tab.dirty}>
      <button data-testid={`switch-${tab.id}`} onClick={() => props.onChange(tab.id)}>{tab.method} {props.labelFor(tab)}</button>
      <button data-testid={`close-${tab.id}`} onClick={() => props.onClose(tab.id)}>close</button>
      <button data-testid={`keep-${tab.id}`} onClick={() => props.onKeep(tab.id)}>keep</button>
      <button data-testid={`pin-${tab.id}`} onClick={() => props.onTogglePin(tab.id)}>pin</button>
      <button data-testid={`others-${tab.id}`} onClick={() => props.onCloseOthers(tab.id)}>others</button>
    </div>}</For>
    <button data-testid="close-all" onClick={() => props.onCloseAll()}>close-all</button>
    <button data-testid="close-saved" onClick={() => props.onCloseSaved()}>close-saved</button>
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
  localStorage.clear()
  mocks.get.mockImplementation(async (id: string) => endpoint(id))
  mocks.tree.mockResolvedValue([{ id: "m", name: "Module", endpoints: [endpoint("A"), endpoint("B"), endpoint("C")], folders: [] }])
  mocks.save.mockResolvedValue(undefined)
  mocks.create.mockResolvedValue(endpoint("created"))
  mocks.cancel.mockResolvedValue(true)
  mocks.stop.mockResolvedValue(undefined)
  mocks.closeWS.mockResolvedValue(undefined)
  mocks.urls.mockReset().mockResolvedValue([
    { environmentId: "dev", baseUrl: "https://dev.example" },
    { environmentId: "prod", baseUrl: "https://prod.example" },
    { environmentId: "stage", baseUrl: "https://stage.example" },
  ])
  mocks.send.mockReset().mockResolvedValue(response("sent"))
  mocks.connect.mockReset().mockResolvedValue(response("connected"))
  mocks.curl.mockReset().mockResolvedValue("curl https://example.com")
  setCurrentEnvironment("p", "dev")
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
    fireEvent.click(within(a).getByText("send"))
    await waitFor(() => expect(mocks.send).toHaveBeenCalled())
    close("A")
    expect(mocks.cancel).toHaveBeenCalledWith(expect.any(String))
    send.resolve({ ...response(""), streaming: true, streamId: "late-stream" })
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith("late-stream"))
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
  })
  it("replaces only the clean preview, while keeping edited and explicitly retained tabs", async () => {
    await start(); await open("A"); await open("B")
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
    expect(screen.getByTestId("tab-B")).toHaveAttribute("data-state", "preview")
    fireEvent.click(screen.getByTestId("keep-B"))
    await open("C"); edit("C", "/changed"); await open("A")
    expect(screen.getByTestId("tab-B")).toHaveAttribute("data-state", "resident")
    expect(screen.getByTestId("tab-C")).toHaveAttribute("data-state", "resident")
    expect(screen.getByTestId("tab-A")).toHaveAttribute("data-state", "preview")
  })

  it("confirms batch discard once and preserves pinned tabs", async () => {
    await start(); await open("A"); fireEvent.click(screen.getByTestId("pin-A"))
    await open("B"); edit("B", "/changed"); await open("C")
    fireEvent.click(screen.getByTestId("close-all"))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    fireEvent.click(screen.getByText("common.cancel"))
    expect(screen.getByTestId("tab-B")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("close-all"))
    fireEvent.click(screen.getByText("common.discard"))
    expect(screen.queryByTestId("tab-B")).not.toBeInTheDocument()
    expect(screen.queryByTestId("tab-C")).not.toBeInTheDocument()
    expect(screen.getByTestId("tab-A")).toHaveAttribute("data-state", "pinned")
    expect(screen.getByTestId("editor-A")).toBeVisible()
    close("A")
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
  })

  it("closes only clean saved tabs and preserves modified, new, and pinned tabs without confirmation", async () => {
    await start(); await open("A"); fireEvent.click(screen.getByTestId("keep-A"))
    await open("B"); edit("B", "/unsaved-edit")
    await open("C"); fireEvent.click(screen.getByTestId("pin-C"))
    fireEvent.click(screen.getByTestId("new"))
    const draft = screen.getAllByTestId(/^tab-/).find(tab => !["tab-A", "tab-B", "tab-C"].includes(tab.dataset.testid!))!
    fireEvent.click(screen.getByTestId("switch-A"))
    fireEvent.click(screen.getByTestId("close-saved"))
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
    expect(screen.getByTestId("tab-B")).toBeInTheDocument()
    expect(within(screen.getByTestId("editor-B")).getByLabelText("path")).toHaveValue("/unsaved-edit")
    expect(screen.getByTestId("tab-C")).toHaveAttribute("data-state", "pinned")
    expect(draft).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    // 保存过但又修改的接口不能被关闭；恢复到保存基线后才成为可关闭项。
    edit("B", "/saved-B")
    fireEvent.click(screen.getByTestId("close-saved"))
    expect(screen.queryByTestId("tab-B")).not.toBeInTheDocument()
    expect(screen.getByTestId("tab-C")).toBeInTheDocument()
    expect(draft).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("uses the left neighbor after closing an active middle tab", async () => {
    await start(); await open("A"); fireEvent.click(screen.getByTestId("keep-A"))
    await open("B"); fireEvent.click(screen.getByTestId("keep-B"))
    await open("C"); fireEvent.click(screen.getByTestId("switch-B")); close("B")
    expect(screen.getByTestId("editor-A")).toBeVisible()
    expect(screen.getByTestId("editor-C")).not.toBeVisible()
  })

  it("honors the owning module's URL display mode in tab titles", async () => {
    mocks.tree.mockResolvedValue([{ id: "m", name: "Module", endpointDisplay: "url", endpoints: [endpoint("A")], folders: [] }])
    await start(); await open("A")
    expect(screen.getByTestId("switch-A")).toHaveTextContent("/saved-A")
    edit("A", "/live-path")
    expect(screen.getByTestId("switch-A")).toHaveTextContent("/live-path")
  })

  it("restores saved layout lazily, preserving order and pins", async () => {
    const { saveRequestTabLayout } = await import("./request-tab-layout")
    const items = ["A", "B"].map(id => ({ id, key: id, name: id, method: "GET" as const, type: "http" as const, path: "/", state: "pinned" as const, saved: true, dirty: false }))
    saveRequestTabLayout("p", items, "B")
    await start()
    await screen.findByTestId("editor-B")
    expect(screen.getByTestId("tab-A")).toHaveAttribute("data-state", "pinned")
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("B")
    fireEvent.click(screen.getByTestId("switch-A"))
    await screen.findByTestId("editor-A")
    expect(mocks.get).toHaveBeenCalledWith("A")
  })

  it("loads a restored neighbor when the active tab closes, then loads the batch-close anchor", async () => {
    const { saveRequestTabLayout } = await import("./request-tab-layout")
    const items = ["A", "B", "C"].map(id => ({ id, key: id, name: id, method: "GET" as const, type: "http" as const, path: "/", state: "resident" as const, saved: true, dirty: false }))
    saveRequestTabLayout("p", items, "C")
    await start()
    await screen.findByTestId("editor-C")
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("C")
    close("C")
    expect(await screen.findByTestId("editor-B")).toBeVisible()
    fireEvent.click(screen.getByTestId("others-A"))
    expect(await screen.findByTestId("editor-A")).toBeVisible()
    expect(screen.queryByTestId("tab-B")).not.toBeInTheDocument()
    expect(mocks.get).toHaveBeenCalledTimes(3)
  })

  it("uses tab shortcuts from inputs but never behind an open confirmation", async () => {
    await start(); await open("A"); edit("A", "/changed")
    await open("B")
    const b = screen.getByTestId("editor-B")
    const modifier = /Mac/i.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }
    fireEvent.keyDown(within(b).getByLabelText("path"), { key: "1", ...modifier })
    expect(screen.getByTestId("editor-A")).toBeVisible()
    fireEvent.keyDown(document.body, { key: "w", ...modifier })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "w", shiftKey: true, ...modifier })
    expect(screen.getByTestId("tab-A")).toBeInTheDocument()
    fireEvent.click(screen.getByText("common.cancel"))
    fireEvent.keyDown(document.body, { key: "w", shiftKey: true, ...modifier })
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
    expect(b).toBeVisible()
  })

  it("cancelling a pending save-close keeps the tab open even if the save later succeeds", async () => {
    const save = deferred<void>(); mocks.save.mockReturnValueOnce(save.promise)
    await start(); await open("A"); edit("A", "/changed"); close("A"); saveAndClose()
    fireEvent.click(screen.getByText("common.cancel"))
    save.resolve()
    await waitFor(() => expect(mocks.tree).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId("tab-A")).toBeInTheDocument()
    expect(screen.getByTestId("tab-A")).toHaveAttribute("data-dirty", "false")
  })

  it("runs two tabs independently and cancels only the active request", async () => {
    const a = deferred<ReturnType<typeof response>>()
    const b = deferred<ReturnType<typeof response>>()
    mocks.send.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    await start(); const editorA = await open("A")
    fireEvent.click(within(editorA).getByText("send"))
    const editorB = await open("B"); fireEvent.click(within(editorB).getByText("send"))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2))
    const requestB = mocks.send.mock.calls[1][0].requestId
    fireEvent.click(within(editorB).getByText("cancel-send"))
    expect(mocks.cancel).toHaveBeenCalledWith(requestB)
    a.resolve(response("A done"))
    await waitFor(() => expect(within(editorA).getByTestId("sending")).toHaveTextContent("false"))
    expect(within(editorB).getByTestId("sending")).toHaveTextContent("true")
    b.resolve(response("B done"))
    await waitFor(() => expect(within(editorB).getByTestId("response")).toHaveTextContent("B done"))
  })

  it("does not send again if the tab closes while the previous stream is stopping", async () => {
    mocks.send.mockResolvedValueOnce({ ...response(""), streaming: true, streamId: "old-stream" })
    await start(); const editor = await open("A")
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(within(editor).getByTestId("sending")).toHaveTextContent("false"))
    const stop = deferred<void>()
    mocks.stop.mockReturnValueOnce(stop.promise)
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith("old-stream"))
    close("A")
    stop.resolve()
    await Promise.resolve(); await Promise.resolve()
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("tab-A")).not.toBeInTheDocument()
  })

  it("honors cancellation while preparing a new send even before backend request registration", async () => {
    mocks.send.mockResolvedValueOnce({ ...response(""), streaming: true, streamId: "old-stream" })
    await start(); const editor = await open("A")
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(within(editor).getByTestId("sending")).toHaveTextContent("false"))
    const stop = deferred<void>()
    mocks.stop.mockReturnValueOnce(stop.promise)
    fireEvent.click(within(editor).getByText("send"))
    fireEvent.click(within(editor).getByText("cancel-send"))
    expect(mocks.cancel).toHaveBeenCalledOnce()
    stop.resolve()
    await waitFor(() => expect(within(editor).getByTestId("sending")).toHaveTextContent("false"))
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("tab-A")).toBeInTheDocument()
    mocks.send.mockResolvedValueOnce(response("retry"))
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(within(editor).getByTestId("response")).toHaveTextContent("retry"))
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it("routes late WebSocket handshakes to their stable connection session", async () => {
    const connect = deferred<ReturnType<typeof response>>()
    mocks.connect.mockReturnValueOnce(connect.promise)
    mocks.get.mockImplementation(async (id: string) => ({ ...endpoint(id), type: id === "A" ? "websocket" : "http" }))
    await start(); const a = await open("A")
    const connectionId = within(a).getByTestId("key").textContent
    fireEvent.click(within(a).getByText("connect"))
    const b = await open("B")
    connect.resolve(response("handshake-A"))
    await waitFor(() => expect(within(a).getByTestId("response")).toHaveTextContent("handshake-A"))
    expect(within(b).getByTestId("response")).toHaveTextContent("empty")
    expect(mocks.connect).toHaveBeenCalledWith(connectionId, expect.objectContaining({ endpointId: "A" }), true)
    close("A")
    expect(mocks.closeWS).toHaveBeenCalledWith(connectionId)
  })

})

describe("request environment snapshots", () => {
  it.each(["send", "connect", "curl"])("%s pins environment and URL while display refresh is pending", async action => {
    await start(); const editor = await open("A")
    await waitFor(() => expect(within(editor).getByTestId("base-url")).toHaveTextContent("https://dev.example"))
    const load = deferred<{ environmentId: string; baseUrl: string }[]>()
    mocks.urls.mockReturnValue(load.promise)
    fireEvent.click(within(editor).getByText("prod"))
    fireEvent.click(within(editor).getByText(action))
    expect(within(editor).getByTestId("base-url")).toHaveTextContent("https://dev.example")
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.curl).not.toHaveBeenCalled()
    // 再次切换不应改变已经点击的操作；仍使用 prod 环境及 prod 地址。
    setCurrentEnvironment("p", "stage")
    load.resolve([
      { environmentId: "prod", baseUrl: "https://prod.example" },
      { environmentId: "stage", baseUrl: "https://stage.example" },
    ])
    const service = action === "send" ? mocks.send : action === "connect" ? mocks.connect : mocks.curl
    await waitFor(() => expect(service).toHaveBeenCalledOnce())
    const data = service.mock.calls[0][action === "connect" ? 1 : 0]
    expect(data).toMatchObject({ environmentId: "prod", baseUrl: "https://prod.example" })
  })

  it.each(["send", "connect", "curl"])("%s never falls back to a stale URL if the current environment lookup fails", async action => {
    await start(); const editor = await open("A")
    const load = deferred<[]>()
    mocks.urls.mockReturnValue(load.promise)
    fireEvent.click(within(editor).getByText("prod"))
    fireEvent.click(within(editor).getByText(action))
    load.reject(new Error("database unavailable"))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.curl).not.toHaveBeenCalled()
  })

  it("uses an empty URL when the selected environment has no module URL", async () => {
    await start(); const editor = await open("A")
    mocks.urls.mockResolvedValue([{ environmentId: "dev", baseUrl: "https://dev.example" }])
    fireEvent.click(within(editor).getByText("prod"))
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ environmentId: "prod", baseUrl: "" })))
  })

  it.each(["send", "connect"])("does not start %s after the tab closes during URL lookup", async action => {
    await start(); const editor = await open("A")
    const load = deferred<[]>()
    mocks.urls.mockReturnValue(load.promise)
    fireEvent.click(within(editor).getByText(action))
    close("A")
    load.resolve([])
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.connect).not.toHaveBeenCalled()
  })
})


describe("service address context", () => {
  it("sends using the unsaved service selection without waiting for the URL badge refresh", async () => {
    await start(); const editor = await open("A")
    fireEvent.click(within(editor).getByText("users-service"))
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(mocks.send).toHaveBeenCalled())
    expect(mocks.urls).toHaveBeenCalledWith("m", "", "users", "http")
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ moduleId: "m", folderId: "", serverId: "users", useEnvironmentBaseUrl: true }))
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("gives new unsaved requests module environment context", async () => {
    await start()
    fireEvent.click(screen.getByTestId("new"))
    const editor = await screen.findByTestId(/^editor-/)
    await waitFor(() => expect(within(editor).getByTestId("base-url")).toHaveTextContent("https://dev.example"))
    fireEvent.click(within(editor).getByText("send"))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ endpointId: "", moduleId: "m", environmentId: "dev", baseUrl: "https://dev.example", useEnvironmentBaseUrl: true })))
  })
})
