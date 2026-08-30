import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProjectExportPanel } from "./ProjectExportPanel"

const { exportConfigured, saveExportedDocument, saveFile } = vi.hoisted(() => ({
  exportConfigured: vi.fn(),
  saveExportedDocument: vi.fn(),
  saveFile: vi.fn(),
}))

vi.mock("@/../bindings/PostPigeon/internal/services", () => ({
  ProjectService: {
    GetProjectTree: vi.fn().mockResolvedValue([{
      id: "module-1", projectId: "project-1", name: "Shop", folders: [{
        id: "folder-1", moduleId: "module-1", parentId: null, name: "Orders", depth: 0,
        children: [], endpoints: [{ id: "endpoint-1", type: "http", method: "POST", name: "Create order", path: "/orders", tags: '["orders"]' }],
      }], endpoints: [],
    }]),
  },
  EnvironmentService: {
    ListEnvironments: vi.fn().mockResolvedValue([{ id: "env-1", projectId: "project-1", name: "Staging" }]),
  },
  ImportExportService: {
    InspectExportSecrets: vi.fn().mockResolvedValue({ secretVariables: 0, authCredentials: 0 }),
    ExportProjectConfigured: exportConfigured,
    SaveExportedDocument: saveExportedDocument,
  },
}))

vi.mock("@wailsio/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wailsio/runtime")>()
  return { ...actual, Dialogs: { ...actual.Dialogs, SaveFile: saveFile } }
})

describe("ProjectExportPanel", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    exportConfigured.mockResolvedValue({ fileName: "Shop.openapi-3.1.zip", mediaType: "application/zip", content: "AA==", encoding: "base64" })
    saveFile.mockResolvedValue("/tmp/Shop.openapi-3.1.zip")
    saveExportedDocument.mockResolvedValue(undefined)
  })

  it("shows Apifox-style scope, OpenAPI, environment, and explicit destination settings", async () => {
    render(() => <ProjectExportPanel projectId="project-1" projectName="Shop" />)

    expect(screen.getAllByText("OpenAPI 3.1").length).toBeGreaterThan(0)
    expect(screen.getAllByText("JSON").length).toBeGreaterThan(0)
    expect(screen.getByText(/Shop\.openapi-3\.1\.zip/)).toBeInTheDocument()
    await screen.findByText("Staging")
    expect(screen.getByText(/本地文件|Local file/)).toBeInTheDocument()
    expect(screen.getByText(/选择目录|Selected folders/)).toBeInTheDocument()
    expect(screen.getByText(/选择接口|Selected APIs/)).toBeInTheDocument()
    expect(screen.getByText(/选择标签|Selected tags/)).toBeInTheDocument()
  })

  it("passes the selected endpoint scope and saves to the chosen path", async () => {
    render(() => <ProjectExportPanel projectId="project-1" projectName="Shop" />)
    await screen.findByText("Staging")
    fireEvent.click(screen.getByText(/选择接口|Selected APIs/))
    fireEvent.click(await screen.findByText(/Shop \/ Orders \/ Create order/))
    fireEvent.click(screen.getByRole("button", { name: /立即导出|Export now/ }))

    await waitFor(() => expect(exportConfigured).toHaveBeenCalledTimes(1))
    expect(exportConfigured.mock.calls[0][1]).toMatchObject({
      format: "openapi",
      scope: { type: "endpoints", selectedEndpointIds: ["endpoint-1"] },
      openapi: { specVersion: "3.1", fileFormat: "json" },
    })
    await waitFor(() => expect(saveExportedDocument).toHaveBeenCalledWith(expect.any(Object), "/tmp/Shop.openapi-3.1.zip"))
  })
})
