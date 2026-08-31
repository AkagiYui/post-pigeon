import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { Environment } from "@/../bindings/PostPigeon/internal/models"

import { getCurrentEnvironmentId, setCurrentEnvironment, setCurrentEnvironmentIds, setProjectEnvironmentsList, setWebSocketMessageDrafts, webSocketMessageDrafts } from "./app"
import { isStringRecord, loadFromStorage } from "./persist"

const envs = [new Environment({ id: "dev", name: "Development" }), new Environment({ id: "prod", name: "正式环境" })]
beforeEach(() => setCurrentEnvironmentIds({}))
describe("project environment selection", () => {
  it("does not force production or the first item when multiple environments exist", () => {
    setProjectEnvironmentsList("p", envs)
    expect(getCurrentEnvironmentId("p")).toBe("")
  })
  it("selects the sole environment and preserves valid selections across reordered reloads", () => {
    setProjectEnvironmentsList("p", [envs[0]])
    expect(getCurrentEnvironmentId("p")).toBe("dev")
    setProjectEnvironmentsList("p", [...envs].reverse())
    expect(getCurrentEnvironmentId("p")).toBe("dev")
    setCurrentEnvironment("p", "prod")
    setProjectEnvironmentsList("p", envs)
    expect(getCurrentEnvironmentId("p")).toBe("prod")
  })
  it("discards deleted selections without borrowing another project's selection", () => {
    setCurrentEnvironment("other", "prod")
    setCurrentEnvironment("p", "deleted")
    setProjectEnvironmentsList("p", envs)
    expect(getCurrentEnvironmentId("p")).toBe("")
    expect(getCurrentEnvironmentId("other")).toBe("prod")
    setProjectEnvironmentsList("p", [envs[1]])
    expect(getCurrentEnvironmentId("p")).toBe("prod")
    setProjectEnvironmentsList("p", [])
    expect(getCurrentEnvironmentId("p")).toBe("")
  })
})

describe("WebSocket message drafts", () => {
  const initialDrafts = webSocketMessageDrafts()

  afterEach(() => setWebSocketMessageDrafts(initialDrafts))

  it("persists drafts by endpoint ID", () => {
    const drafts = { "endpoint-1": "first line\nsecond line", "endpoint-2": "keep me" }
    setWebSocketMessageDrafts(drafts)

    expect(webSocketMessageDrafts()).toEqual(drafts)
    expect(loadFromStorage("webSocketMessageDrafts", {}, isStringRecord)).toEqual(drafts)
  })
})
