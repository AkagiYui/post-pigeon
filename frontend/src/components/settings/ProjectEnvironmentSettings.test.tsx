import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { Module, ModuleBaseURL, ModuleServer, ServerBaseURL } from "@/../bindings/PostPigeon/internal/models"

import { EnvironmentDetailEditor } from "./ProjectEnvironmentSettings"

const mocks = vi.hoisted(() => ({ save: vi.fn(), changed: vi.fn(), error: vi.fn() }))
vi.mock("@/hooks/useI18n", () => ({ t: (key: string) => key }))
vi.mock("@/stores/toast", () => ({ toastError: mocks.error, showToast: vi.fn() }))
vi.mock("@/stores/app", () => ({ notifyBaseUrlsChanged: mocks.changed, setProjectEnvironmentsList: vi.fn() }))
vi.mock("./EnvironmentVariablesEditor", () => ({ EnvironmentVariablesEditor: () => null }))
vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  EnvironmentService: { GetEnvironment: async () => ({ name: "Development" }) },
  ModuleService: {
    ListModules: async () => [new Module({ id: "m", name: "Module", servers: [new ModuleServer({ id: "users", name: "Users service" })] })],
    GetModuleBaseURLs: async () => [new ModuleBaseURL({ moduleId: "m", environmentId: "dev", baseUrl: "https://legacy.example", websocketBaseUrl: null, serverUrls: { users: new ServerBaseURL({ http: "https://users.example" }) } })],
    SaveEnvironmentBaseURLs: mocks.save,
  },
}))
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockReset().mockResolvedValue(undefined) })
afterEach(cleanup)

it("saves protocol and service addresses together while retaining explicit empty WebSocket addresses", async () => {
  render(() => <EnvironmentDetailEditor projectId="p" environmentId="dev" />)
  await screen.findByText("Users service")
  const httpInputs = screen.getAllByLabelText("HTTP")
  const wsInputs = screen.getAllByLabelText("WebSocket")
  expect(wsInputs[0]).toBeDisabled()
  expect(wsInputs[0]).toHaveValue("https://legacy.example")
  fireEvent.click(screen.getByRole("checkbox", { name: "server.shareHTTP" }))
  expect(wsInputs[0]).not.toBeDisabled()
  fireEvent.input(wsInputs[0], { target: { value: "" } })
  fireEvent.input(httpInputs[1], { target: { value: "https://new-users.example" } })
  fireEvent.input(wsInputs[1], { target: { value: "wss://users.example" } })
  fireEvent.click(screen.getByRole("button", { name: "common.save" }))
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledOnce())
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith("dev", [expect.objectContaining({
    moduleId: "m", baseUrl: "https://legacy.example", websocketBaseUrl: "", serverUrls: { users: { http: "https://new-users.example", websocket: "wss://users.example" } },
  })])
  expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled()
})

it("keeps unsaved addresses on failure and does not publish a refresh", async () => {
  mocks.save.mockRejectedValue(new Error("database unavailable"))
  const { container } = render(() => <EnvironmentDetailEditor projectId="p" environmentId="dev" />)
  await screen.findByText("Users service")
  fireEvent.input(within(container).getAllByLabelText("HTTP")[0], { target: { value: "https://unsaved.example" } })
  fireEvent.click(screen.getByRole("button", { name: "common.save" }))
  await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce())
  expect(screen.getAllByLabelText("HTTP")[0]).toHaveValue("https://unsaved.example")
  expect(screen.getByRole("button", { name: "common.save" })).toBeEnabled()
  expect(mocks.changed).not.toHaveBeenCalled()
})
