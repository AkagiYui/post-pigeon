import { describe, expect, it, vi } from "vitest"

vi.mock("@/stores/app", () => ({ openProjectIds: () => ["p"] }))

import { loadRouteState, saveRouteState } from "@/stores/routeCache"

import type { EndpointData } from "./editor-types"
import { emptyAuth } from "./editor-types"
import { endpointDefaults } from "./endpoint-data"
import { createRequestSession, createRequestWorkspaceState, endpointFingerprint, snapshotEndpoint } from "./request-session"

function draft(): EndpointData {
  return { ...endpointDefaults, id: "A", name: "A", method: "GET", path: "/", baseUrl: "", bodyType: "none", bodyContent: "", contentType: "", timeout: 30000, followRedirects: null, params: [], headers: [], bodyFields: [], auth: emptyAuth(), preRequestScript: "", postResponseScript: "" }
}

describe("request session cache and snapshots", () => {
  it("keeps the same live session across route cache restore so late responses reach both views", () => {
    const workspace = createRequestWorkspaceState()
    workspace.setSession("A", createRequestSession(draft()))
    saveRouteState("p", "index", { requestWorkspace: workspace })
    const restored = loadRouteState<{ requestWorkspace: ReturnType<typeof createRequestWorkspaceState> }>("p", "index")!.requestWorkspace
    workspace.patchSession("A", { requestId: "in-flight" })
    expect(restored.state.sessions.A?.requestId).toBe("in-flight")
    restored.patchSession("A", { requestId: "" })
    expect(workspace.state.sessions.A?.requestId).toBe("")
    restored.setActive("A")
    expect(workspace.state.activeTabId).toBe("A")
  })
  it("snapshots mutable nested data and ignores derived environment and inheritance flags", () => {
    const data = draft()
    const baseline = endpointFingerprint(data)
    const snapshot = snapshotEndpoint(data)
    data.auth.username = "changed"
    expect(snapshot.auth.username).not.toBe("changed")
    expect(endpointFingerprint({ ...snapshot, baseUrl: "https://another-environment", hasInheritedAuth: true, inheritedWsProtocolConversion: false })).toBe(baseline)
    expect(endpointFingerprint({ ...snapshot, path: "/changed" })).not.toBe(baseline)
  })
})
