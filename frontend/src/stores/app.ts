// 全局应用状态管理
import { createSignal } from 'solid-js'

/** 当前打开的项目 ID 列表 */
const [openProjectIds, setOpenProjectIds] = createSignal<string[]>([])
/** 当前激活的项目 ID */
const [activeProjectId, setActiveProjectId] = createSignal<string | null>(null)
/** 设置模态框是否显示 */
const [settingsOpen, setSettingsOpen] = createSignal(false)
/** 当前环境 ID（每个项目独立） */
const [currentEnvironmentIds, setCurrentEnvironmentIds] = createSignal<Record<string, string>>({})
/** 项目名称映射（projectId -> projectName） */
const [projectNames, setProjectNames] = createSignal<Record<string, string>>({})

export {
    openProjectIds, setOpenProjectIds,
    activeProjectId, setActiveProjectId,
    settingsOpen, setSettingsOpen,
    currentEnvironmentIds, setCurrentEnvironmentIds,
    projectNames, setProjectNames,
}

/** 打开项目 */
export function openProject(id: string) {
    if (!openProjectIds().includes(id)) {
        setOpenProjectIds(prev => [...prev, id])
    }
    setActiveProjectId(id)
}

/** 关闭项目 */
export function closeProject(id: string) {
    setOpenProjectIds(prev => prev.filter(p => p !== id))
    if (activeProjectId() === id) {
        const remaining = openProjectIds().filter(p => p !== id)
        setActiveProjectId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
    }
}

/** 获取当前项目的环境 ID */
export function getCurrentEnvironmentId(projectId: string): string {
    return currentEnvironmentIds()[projectId] || ''
}

/** 设置当前项目的环境 */
export function setCurrentEnvironment(projectId: string, envId: string) {
    setCurrentEnvironmentIds(prev => ({ ...prev, [projectId]: envId }))
}
