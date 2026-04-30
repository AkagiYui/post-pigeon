// 全局应用状态管理
import { createEffect, createRoot, createSignal } from "solid-js"

// ---- localStorage 持久化工具 ----

const STORAGE_PREFIX = "post-pigeon:"

/**
 * 从 localStorage 读取 JSON 数据
 */
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw !== null) {
      return JSON.parse(raw) as T
    }
  } catch {
    // 解析失败时忽略
  }
  return fallback
}

/**
 * 将数据写入 localStorage
 */
function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // 写入失败时忽略（如存储空间不足）
  }
}

// ---- 持久化的应用状态 ----

/** 当前打开的项目 ID 列表（持久化） */
const [openProjectIds, setOpenProjectIds] = createSignal<string[]>(
  loadFromStorage<string[]>("openProjectIds", []),
)

/** 当前激活的项目 ID（持久化） */
const [activeProjectId, setActiveProjectId] = createSignal<string | null>(
  loadFromStorage<string | null>("activeProjectId", null),
)

/** 当前环境 ID 映射（每个项目独立，持久化） */
const [currentEnvironmentIds, setCurrentEnvironmentIds] = createSignal<Record<string, string>>(
  loadFromStorage<Record<string, string>>("currentEnvironmentIds", {}),
)

/** 项目名称映射 projectId -> projectName（持久化） */
const [projectNames, setProjectNames] = createSignal<Record<string, string>>(
  loadFromStorage<Record<string, string>>("projectNames", {}),
)

/** 项目环境列表映射 projectId -> environments[]（持久化） */
const [projectEnvironments, setProjectEnvironments] = createSignal<Record<string, any[]>>({})

/** 设置模态框是否显示（不持久化） */
const [settingsOpen, setSettingsOpen] = createSignal(false)

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
}

/** 打开项目（添加到打开列表并设为激活） */
export function openProject(id: string) {
  if (!openProjectIds().includes(id)) {
    setOpenProjectIds(prev => [...prev, id])
  }
  setActiveProjectId(id)
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
export function getProjectEnvironments(projectId: string): any[] {
  return projectEnvironments()[projectId] || []
}

/** 设置当前项目的环境列表 */
export function setProjectEnvironmentsList(projectId: string, envs: any[]) {
  setProjectEnvironments(prev => ({ ...prev, [projectId]: envs }))
}
