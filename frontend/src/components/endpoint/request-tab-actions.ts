import type { RequestTab } from "./request-session"

export function keepRequestTab(tabs: RequestTab[], id: string): RequestTab[] {
  return tabs.map(tab => tab.id === id && tab.state === "preview" ? { ...tab, state: "resident" } : tab)
}

export function togglePinnedTab(tabs: RequestTab[], id: string): RequestTab[] {
  const tab = tabs.find(tab => tab.id === id)
  if (!tab) return tabs
  const others = tabs.filter(tab => tab.id !== id)
  if (tab.state !== "pinned") return [{ ...tab, state: "pinned" }, ...others]
  const boundary = others.findIndex(tab => tab.state !== "pinned")
  const result = [...others]
  result.splice(boundary < 0 ? others.length : boundary, 0, { ...tab, state: "resident" })
  return result
}

/** 预览和常驻都属于非固定组；禁止固定项越过分组边界。 */
export function moveRequestTab(tabs: RequestTab[], fromId: string, toId: string): RequestTab[] {
  const from = tabs.findIndex(tab => tab.id === fromId)
  const to = tabs.findIndex(tab => tab.id === toId)
  if (from < 0 || to < 0 || from === to || (tabs[from].state === "pinned") !== (tabs[to].state === "pinned")) return tabs
  const result = [...tabs]
  result.splice(to, 0, result.splice(from, 1)[0])
  return result
}

export function batchCloseTargets(tabs: RequestTab[], exceptId?: string): string[] {
  return tabs.filter(tab => tab.state !== "pinned" && tab.id !== exceptId).map(tab => tab.id)
}

export function switchRequestTab(tabs: RequestTab[], activeId: string | null, command: "next" | "previous" | number): string | undefined {
  if (!tabs.length) return
  if (typeof command === "number") return tabs[command === 9 ? tabs.length - 1 : command - 1]?.id
  const current = tabs.findIndex(tab => tab.id === activeId)
  const direction = command === "next" ? 1 : -1
  return tabs[(Math.max(0, current) + direction + tabs.length) % tabs.length].id
}
