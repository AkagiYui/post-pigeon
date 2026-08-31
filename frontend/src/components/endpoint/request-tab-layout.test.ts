import { beforeEach, describe, expect, it } from "vitest"

import { encodeStored, STORAGE_PREFIX } from "@/stores/persist"

import type { RequestTab } from "./request-session"
import { loadRequestTabLayout, saveRequestTabLayout } from "./request-tab-layout"

const key = `${STORAGE_PREFIX}requestTabs:p`
const tab = (id: string, state: RequestTab["state"] = "resident", saved = true): RequestTab => ({
  id, key: id, state, saved, dirty: true, name: "secret name", path: "https://private/?token=secret", method: "GET", type: "http",
})
beforeEach(() => localStorage.clear())
describe("request tab layout persistence", () => {
  it("restores saved IDs, order, pins and selection without persisting sensitive drafts", () => {
    saveRequestTabLayout("p", [tab("P", "pinned"), tab("A"), tab("U", "resident", false)], "A")
    const stored = localStorage.getItem(key)!
    expect(stored).not.toMatch(/secret|https|dirty|method|name|"U"/)
    expect(loadRequestTabLayout("p", new Set(["P", "A"]))).toEqual({ tabs: [{ id: "P", state: "pinned" }, { id: "A", state: "resident" }], activeId: "A" })
    expect(loadRequestTabLayout("another-project", new Set(["P", "A"])).tabs).toEqual([])
  })
  it("purges deleted/duplicate endpoints and normalizes preview and fixed groups", () => {
    localStorage.setItem(key, encodeStored({ tabs: [tab("A", "preview"), tab("P", "pinned"), tab("B", "preview"), tab("A"), tab("deleted")], activeId: "deleted" }))
    expect(loadRequestTabLayout("p", new Set(["A", "B", "P"]))).toEqual({ tabs: [{ id: "P", state: "pinned" }, { id: "A", state: "preview" }, { id: "B", state: "resident" }], activeId: "P" })
  })
  it.each(["broken JSON", '{"v":99,"data":{"tabs":[],"activeId":null}}', '{"tabs":[null],"activeId":null}', '{"tabs":[{"id":"A","state":"bad"}],"activeId":null}'])("ignores invalid saved state: %s", raw => {
    localStorage.setItem(key, raw)
    expect(loadRequestTabLayout("p", new Set(["A"]))).toEqual({ tabs: [], activeId: null })
  })
})
