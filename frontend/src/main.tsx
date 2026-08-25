/* @refresh reload */
// solid-devtools 的 vite 插件会把这行替换成 debugger 的 setup。
// 必须在应用渲染之前执行，否则 solid 的 DEV 钩子装不上，devtools 面板拿不到 owner 树。
// 生产构建下该包解析到 noop 实现。
import "solid-devtools"

import { RouterProvider } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import { ProjectService } from "@/../bindings/PostPigeon/internal/services"
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

  // 并行验证项目是否存在，同时刷新名称缓存。
  // 这些查询彼此独立，串行只会把启动时间乘以已打开项目的数量。
  const nameMap: Record<string, string> = { ...projectNames() }
  let hasChanges = false

  const checked = await Promise.all(ids.map(async (id) => {
    try {
      const project = await ProjectService.GetProject(id)
      // 项目已被删除时返回 null，从打开列表中剔除
      return { id, project, keep: Boolean(project) }
    } catch {
      // 查询失败时保留该项目（可能是暂时性错误）
      return { id, project: null, keep: true }
    }
  }))

  const validIds: string[] = []
  for (const entry of checked) {
    if (!entry.keep) {
      hasChanges = true
      continue
    }
    validIds.push(entry.id)
    const name = entry.project?.name
    if (name && name !== nameMap[entry.id]) {
      nameMap[entry.id] = name
      hasChanges = true
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

// 初始化主题、语言，并恢复应用状态。
// 整条链路必须带 catch：任何一步失败都不应变成未捕获的 Promise 拒绝，
// 否则用户看到的是一个永远停在加载态的空白窗口且控制台里毫无线索。
Promise.all([initTheme(), initI18n()]).then(async () => {
  // 初始化缩放快捷键
  initScaleShortcuts()

  // 恢复持久化的应用状态
  await restoreAppState()

  const router = getRouter()

  // 供 Vite DevTools 的 dock 面板消费：面板是独立模块，只能通过固定全局名拿到页面实例。
  // import.meta.env.DEV 在生产构建里是常量 false，整块连同动态 import 一起被摇掉。
  if (import.meta.env.DEV) {
    window.__DEVTOOLS_ROUTER__ = router
    // 注入本项目版本的 devtools 组件，面板与项目的 tanstack 版本完全一致
    void import("@tanstack/solid-router-devtools").then((mod) => {
      window.__DEVTOOLS_COMPONENTS__ = { SolidRouterDevtoolsPanel: mod.TanStackRouterDevtoolsPanel }
    })
  }

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
}).catch((error) => {
  console.error("应用初始化失败", error)
  const rootElement = document.getElementById("app")
  if (rootElement) {
    rootElement.textContent = String(error instanceof Error ? error.message : error)
  }
})
