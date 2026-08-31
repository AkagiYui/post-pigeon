import { describe, expect, it } from "vitest"

import type { RequestTab } from "./request-session"
import { batchCloseTargets, keepRequestTab, moveRequestTab, switchRequestTab, togglePinnedTab } from "./request-tab-actions"

function tab(id: string, state: RequestTab["state"] = "resident"): RequestTab {
  return { id, key: id, name: id, method: "GET", type: "http", path: "/", saved: true, dirty: false, state }
}
const ids = (tabs: RequestTab[]) => tabs.map(tab => tab.id)

describe("request tab state transitions", () => {
  it("keeps preview independently of dirty and never unpins a tab", () => {
    const tabs = [tab("A", "preview"), { ...tab("B", "pinned"), dirty: true }]
    const kept = keepRequestTab(keepRequestTab(tabs, "A"), "B")
    expect(kept[0]).toMatchObject({ state: "resident", dirty: false })
    expect(kept[1]).toMatchObject({ state: "pinned", dirty: true })
  })
  it("puts new pins first and unpins at the non-pinned boundary", () => {
    const tabs = [tab("P", "pinned"), tab("A"), tab("B", "preview")]
    const pinned = togglePinnedTab(tabs, "B")
    expect(ids(pinned)).toEqual(["B", "P", "A"])
    const unpinned = togglePinnedTab(pinned, "B")
    expect(ids(unpinned)).toEqual(["P", "B", "A"])
    expect(unpinned[1].state).toBe("resident")
    expect(ids(tabs)).toEqual(["P", "A", "B"])
  })
  it("allows dragging preview among resident tabs but refuses cross-group and stale drags", () => {
    const tabs = [tab("P", "pinned"), tab("A"), tab("B", "preview")]
    expect(ids(moveRequestTab(tabs, "B", "A"))).toEqual(["P", "B", "A"])
    expect(moveRequestTab(tabs, "P", "B")).toBe(tabs)
    expect(moveRequestTab(tabs, "gone", "B")).toBe(tabs)
  })
  it("preserves pinned tabs and the explicitly chosen tab in bulk operations", () => {
    const tabs = [tab("P", "pinned"), tab("A"), { ...tab("B"), saved: false }]
    expect(batchCloseTargets(tabs)).toEqual(["A", "B"])
    expect(batchCloseTargets(tabs, "B")).toEqual(["A"])
  })
  it("cycles and reserves 9 for the last tab", () => {
    const tabs = Array.from({ length: 12 }, (_, n) => tab(String(n + 1)))
    expect(switchRequestTab(tabs, "12", "next")).toBe("1")
    expect(switchRequestTab(tabs, "1", "previous")).toBe("12")
    expect(switchRequestTab(tabs, "1", 9)).toBe("12")
    expect(switchRequestTab(tabs.slice(0, 2), "1", 8)).toBeUndefined()
    expect(switchRequestTab([], null, "next")).toBeUndefined()
  })
})
