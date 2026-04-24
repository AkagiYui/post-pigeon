/* @refresh reload */
import { RouterProvider } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { initI18n } from "@/hooks/useI18n"
import { initScaleShortcuts, initTheme } from "@/hooks/useTheme"
import { getRouter } from "@/router"
import { activeProjectId, openProjectIds, projectNames, setActiveProjectId, setOpenProjectIds, setProjectNames } from "@/stores/app"

// 禁用默认的右键菜单
// 有自定义右键菜单的组件会自己处理 contextmenu 事件
document.addEventListener("contextmenu", (e) => {
  e.preventDefault()
})

/**
 * 恢复并验证持久化的应用状态
 * 在应用启动时检查每个已打开的项目是否仍然存在，
 * 清理无效数据，刷新项目名称缓存。
 */
async function restoreAppState() {
  const ids = openProjectIds()
  if (ids.length === 0) return

  // 逐个验证项目是否存在，同时刷新名称缓存
  const validIds: string[] = []
  const nameMap: Record<string, string> = { ...projectNames() }
  let hasChanges = false

  for (const id of ids) {
    try {
      const project = await ProjectService.GetProject(id)
      if (project) {
        validIds.push(id)
        // 更新名称缓存（可能被外部重命名）
        if (project.name && project.name !== nameMap[id]) {
          nameMap[id] = project.name
          hasChanges = true
        }
      } else {
        // 项目已被删除，跳过
        hasChanges = true
      }
    } catch {
      // 查询失败时保留该项目（可能是暂时性错误）
      validIds.push(id)
    }
  }

  // 更新有效的项目 ID 列表
  if (validIds.length !== ids.length) {
    setOpenProjectIds(validIds)
  }

  // 如果当前激活的项目不再有效，切换到最后一个有效项目
  const currentActive = activeProjectId()
  if (currentActive && !validIds.includes(currentActive)) {
    setActiveProjectId(validIds.length > 0 ? validIds[validIds.length - 1] : null)
  }

  // 更新名称缓存
  if (hasChanges) {
    setProjectNames(nameMap)
  }
}

// 初始化主题、语言，并恢复应用状态
Promise.all([initTheme(), initI18n()]).then(async () => {
  // 初始化缩放快捷键
  initScaleShortcuts()

  // 恢复持久化的应用状态
  await restoreAppState()

  const router = getRouter()
  const rootElement = document.getElementById("app")

  if (!rootElement) {
    throw new Error("App root element not found")
  }

  render(() => <RouterProvider router={router} />, rootElement)

  // 渲染完成后，导航到上次激活的项目（如有）
  // 实现关闭程序后重新打开时自动恢复当前工作区
  const activeId = activeProjectId()
  if (activeId && openProjectIds().includes(activeId)) {
    queueMicrotask(() => {
      router.navigate({ to: "/project/$id", params: { id: activeId } }).catch(() => {
        // 导航失败时忽略（如项目页面已被删除）
      })
    })
  }
})
