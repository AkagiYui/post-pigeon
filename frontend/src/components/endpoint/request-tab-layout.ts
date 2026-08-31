import { loadFromStorage, saveToStorage } from "@/stores/persist"

import type { RequestTab } from "./request-session"

export interface RequestTabLayout {
  tabs: { id: string; state: RequestTab["state"] }[]
  activeId: string | null
}

function isLayout(value: unknown): value is RequestTabLayout {
  if (!value || typeof value !== "object") return false
  const layout = value as RequestTabLayout
  return (layout.activeId === null || typeof layout.activeId === "string") && Array.isArray(layout.tabs)
    && layout.tabs.length <= 500
    && layout.tabs.every(tab => tab && typeof tab.id === "string" && tab.id.length > 0 && tab.id.length <= 200
      && ["preview", "resident", "pinned"].includes(tab.state))
}

/** 只保存已存在的端点 ID、顺序和固定状态；绝不持久化请求/响应/草稿或名称、URL。 */
export function saveRequestTabLayout(projectId: string, tabs: RequestTab[], activeId: string | null) {
  const saved = tabs.filter(tab => tab.saved).map(({ id, state }) => ({ id, state }))
  saveToStorage(`requestTabs:${projectId}`, {
    tabs: saved,
    activeId: saved.some(tab => tab.id === activeId) ? activeId : saved.at(-1)?.id ?? null,
  } satisfies RequestTabLayout)
}

export function loadRequestTabLayout(projectId: string, availableIds: ReadonlySet<string>): RequestTabLayout {
  const saved = loadFromStorage<RequestTabLayout>(`requestTabs:${projectId}`, { tabs: [], activeId: null }, isLayout)
  const seen = new Set<string>()
  let previewSeen = false
  const tabs: RequestTabLayout["tabs"] = []
  for (const tab of saved.tabs) {
    if (seen.has(tab.id) || !availableIds.has(tab.id)) continue
    seen.add(tab.id)
    const state = tab.state === "preview" && previewSeen ? "resident" : tab.state
    if (state === "preview") previewSeen = true
    tabs.push({ id: tab.id, state })
  }
  // 即使旧数据顺序损坏，固定组也始终位于前部。
  tabs.sort((a, b) => Number(b.state === "pinned") - Number(a.state === "pinned"))
  return { tabs, activeId: tabs.some(tab => tab.id === saved.activeId) ? saved.activeId : tabs[0]?.id ?? null }
}
