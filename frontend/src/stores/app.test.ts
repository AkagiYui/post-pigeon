import { afterEach, describe, expect, it } from "vitest"

import { setWebSocketMessageDrafts, webSocketMessageDrafts } from "./app"
import { isStringRecord, loadFromStorage } from "./persist"

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
