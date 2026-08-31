// 全局应用状态管理
import { createEffect, createRoot, createSignal } from "solid-js"

import type { Environment } from "@/../bindings/PostPigeon/internal/models"

import {
  isBoolean,
  isNullableString,
  isStringArray,
  isStringRecord,
  loadFromStorage,
  oneOf,
  saveToStorage,
} from "./persist"

// ---- 持久化的应用状态 ----

/** 当前打开的项目 ID 列表（持久化） */
const [openProjectIds, setOpenProjectIds] = createSignal<string[]>(
  loadFromStorage("openProjectIds", [], isStringArray),
)

/** 当前激活的项目 ID（持久化） */
const [activeProjectId, setActiveProjectId] = createSignal<string | null>(
  loadFromStorage<string | null>("activeProjectId", null, isNullableString),
)

/** 当前环境 ID 映射（每个项目独立，持久化） */
const [currentEnvironmentIds, setCurrentEnvironmentIds] = createSignal<Record<string, string>>(
  loadFromStorage<Record<string, string>>("currentEnvironmentIds", {}, isStringRecord),
)

/** 项目名称映射 projectId -> projectName（持久化） */
const [projectNames, setProjectNames] = createSignal<Record<string, string>>(
  loadFromStorage<Record<string, string>>("projectNames", {}, isStringRecord),
)

/** 项目环境列表映射 projectId -> environments[]（仅内存缓存，不持久化） */
const [projectEnvironments, setProjectEnvironments] = createSignal<Record<string, Environment[]>>({})

/** 响应面板布局方向：bottom（上下结构）/ right（左右结构）（持久化） */
const [responseLayout, setResponseLayout] = createSignal<"bottom" | "right">(
  loadFromStorage("responseLayout", "bottom" as const, oneOf("bottom", "right")),
)

/** WebSocket 文本消息是否解析合法 JSON 并还原字符串转义（持久化） */
const [parseWebSocketJSON, setParseWebSocketJSON] = createSignal(
  loadFromStorage("parseWebSocketJSON", true, isBoolean),
)

/** WebSocket JSON 消息解析后是否用两空格缩进（持久化） */
const [formatWebSocketJSON, setFormatWebSocketJSON] = createSignal(
  loadFromStorage("formatWebSocketJSON", true, isBoolean),
)

/** WebSocket 消息发送成功后是否清空编辑器（持久化） */
const [clearWebSocketMessageAfterSend, setClearWebSocketMessageAfterSend] = createSignal(
  loadFromStorage("clearWebSocketMessageAfterSend", true, isBoolean),
)

/** WebSocket 消息草稿（按接口 ID 保存，持久化） */
const [webSocketMessageDrafts, setWebSocketMessageDrafts] = createSignal<Record<string, string>>(
  loadFromStorage("webSocketMessageDrafts", {}, isStringRecord),
)

/** 设置模态框是否显示（不持久化） */
const [settingsOpen, setSettingsOpen] = createSignal(false)

/** 当前设置标签，允许全局更新提示直接打开更新页（不持久化） */
export const [settingsTab, setSettingsTab] = createSignal("appearance")

/** baseUrl 版本号，设置面板保存后递增，供其他组件监听变化（不持久化） */
const [baseUrlVersion, setBaseUrlVersion] = createSignal(0)

/** 通知 baseUrl 已变更（设置面板保存后调用） */
export function notifyBaseUrlsChanged() {
  setBaseUrlVersion(prev => prev + 1)
}

export {
  openProjectIds, setOpenProjectIds,
  activeProjectId, setActiveProjectId,
  settingsOpen, setSettingsOpen,
  responseLayout, setResponseLayout,
  parseWebSocketJSON, setParseWebSocketJSON,
  formatWebSocketJSON, setFormatWebSocketJSON,
  clearWebSocketMessageAfterSend, setClearWebSocketMessageAfterSend,
  webSocketMessageDrafts, setWebSocketMessageDrafts,
  currentEnvironmentIds, setCurrentEnvironmentIds,
  projectNames, setProjectNames,
  projectEnvironments, setProjectEnvironments,
  baseUrlVersion,
}

// ---- 自动持久化：在模块根作用域创建 effect 监听状态变化 ----

if (typeof window !== "undefined") {
  createRoot(() => {
    // 监听并持久化 openProjectIds
    createEffect(() => {
      saveToStorage("openProjectIds", openProjectIds())
    })
  })

  createRoot(() => {
    // 监听并持久化 activeProjectId
    createEffect(() => {
      const id = activeProjectId()
      saveToStorage("activeProjectId", id)
    })
  })

  createRoot(() => {
    // 监听并持久化 currentEnvironmentIds
    createEffect(() => {
      saveToStorage("currentEnvironmentIds", currentEnvironmentIds())
    })
  })

  createRoot(() => {
    // 监听并持久化 projectNames
    createEffect(() => {
      saveToStorage("projectNames", projectNames())
    })
  })

  createRoot(() => {
    // 监听并持久化 responseLayout
    createEffect(() => {
      saveToStorage("responseLayout", responseLayout())
    })
  })

  createRoot(() => {
    // 监听并持久化 WebSocket JSON 解析偏好
    createEffect(() => {
      saveToStorage("parseWebSocketJSON", parseWebSocketJSON())
    })
  })

  createRoot(() => {
    // 监听并持久化 WebSocket JSON 格式化偏好
    createEffect(() => {
      saveToStorage("formatWebSocketJSON", formatWebSocketJSON())
    })
  })

  createRoot(() => {
    // 监听并持久化 WebSocket 发送后清空偏好
    createEffect(() => {
      saveToStorage("clearWebSocketMessageAfterSend", clearWebSocketMessageAfterSend())
    })
  })

  createRoot(() => {
    // 连接切换或应用重启后恢复各接口正在编辑的消息。
    createEffect(() => {
      saveToStorage("webSocketMessageDrafts", webSocketMessageDrafts())
    })
  })
}

/** 打开项目（添加到打开列表并设为激活） */
export function openProject(id: string) {
  if (!openProjectIds().includes(id)) {
    setOpenProjectIds(prev => [...prev, id])
  }
  setActiveProjectId(id)
}

/** 重新排序打开的项目标签（顶栏拖拽排序使用，自动持久化到 localStorage） */
export function reorderOpenProjects(orderedIds: string[]) {
  setOpenProjectIds(orderedIds)
}

/** 关闭项目（从打开列表移除，并更新激活项目） */
export function closeProject(id: string) {
  setOpenProjectIds(prev => prev.filter(p => p !== id))
  if (activeProjectId() === id) {
    const remaining = openProjectIds().filter(p => p !== id)
    setActiveProjectId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
  }
}

/** 获取当前项目的环境 ID */
export function getCurrentEnvironmentId(projectId: string): string {
  return currentEnvironmentIds()[projectId] || ""
}

/** 设置当前项目的环境 */
export function setCurrentEnvironment(projectId: string, envId: string) {
  setCurrentEnvironmentIds(prev => ({ ...prev, [projectId]: envId }))
}

/** 获取当前项目的环境列表 */
export function getProjectEnvironments(projectId: string): Environment[] {
  return projectEnvironments()[projectId] || []
}

/** 设置当前项目的环境列表 */
export function setProjectEnvironmentsList(projectId: string, envs: Environment[]) {
  setProjectEnvironments(prev => ({ ...prev, [projectId]: envs }))
}
