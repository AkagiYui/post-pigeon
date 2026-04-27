// 通用路由状态缓存层
// 按 (projectId, routeName) 缓存页面状态，切换项目后恢复，无需重新加载或重新输入
// 当关闭项目标签页时，自动释放对应的缓存
import { createEffect, createRoot } from "solid-js"
import { createStore, reconcile } from "solid-js/store"

import { openProjectIds } from "@/stores/app"

// ---- 类型定义 ----

/** 缓存条目：按 routeName 缓存状态的映射 */
interface ProjectCache {
  [routeName: string]: unknown
}

/** 按 projectId 索引的缓存集合 */
interface RouteCacheStore {
  [projectId: string]: ProjectCache | undefined
}

// ---- 配置 ----

/** 最多缓存的项目数，超出时淘汰最久未访问的 */
const MAX_CACHED_PROJECTS = 20

/** 当前缓存的 projectId 访问顺序（用于 LRU 淘汰） */
const accessOrder: string[] = []

// ---- Store ----

const [routeCache, setRouteCache] = createStore<RouteCacheStore>({})

/**
 * 保存某个路由页面的状态到缓存
 * @param projectId 项目 ID
 * @param routeName 路由名称（如 "index"、"history"、"settings"）
 * @param state     需要缓存的状态数据
 */
export function saveRouteState(projectId: string, routeName: string, state: unknown): void {
  if (!projectId) return

  // 更新访问顺序
  const idx = accessOrder.indexOf(projectId)
  if (idx >= 0) {
    accessOrder.splice(idx, 1)
  }
  accessOrder.push(projectId)

  // 淘汰超出上限的缓存（LRU）
  while (accessOrder.length > MAX_CACHED_PROJECTS) {
    const oldestId = accessOrder.shift()
    if (oldestId) {
      setRouteCache(oldestId, undefined)
    }
  }

  // 先确保父级对象存在，再设置嵌套属性（避免 SolidJS Store 路径报错）
  if (!routeCache[projectId]) {
    setRouteCache(projectId, {} as ProjectCache)
  }
  setRouteCache(projectId, routeName, state as never)
}

/**
 * 从缓存中读取某个路由页面的状态
 * @param projectId 项目 ID
 * @param routeName 路由名称
 * @returns 缓存的状态，不存在则返回 undefined
 */
export function loadRouteState<T = unknown>(projectId: string, routeName: string): T | undefined {
  // 更新访问顺序
  const idx = accessOrder.indexOf(projectId)
  if (idx >= 0) {
    accessOrder.splice(idx, 1)
    accessOrder.push(projectId)
  }

  const projectCache = routeCache[projectId] as ProjectCache | undefined
  return projectCache?.[routeName] as T | undefined
}

/**
 * 清除某个项目的所有路由缓存
 * @param projectId 项目 ID
 */
export function clearProjectCache(projectId: string): void {
  setRouteCache(projectId, undefined)
  const idx = accessOrder.indexOf(projectId)
  if (idx >= 0) {
    accessOrder.splice(idx, 1)
  }
}

/**
 * 检查某个项目是否有缓存
 */
export function hasProjectCache(projectId: string): boolean {
  const projectCache = routeCache[projectId] as ProjectCache | undefined
  return projectCache !== undefined && Object.keys(projectCache).length > 0
}

/**
 * 获取当前所有缓存的项目 ID 列表
 */
export function getCachedProjectIds(): string[] {
  return Object.keys(routeCache).filter((id) => routeCache[id] !== undefined)
}

// ---- 自动清理：当项目标签页关闭时，释放对应的缓存 ----

if (typeof window !== "undefined") {
  createRoot(() => {
    createEffect(() => {
      // 获取当前所有打开的项目 ID
      const openIds = openProjectIds()
      const cachedIds = getCachedProjectIds()

      // 对于已经缓存但不再打开的项目，清理缓存
      for (const cachedId of cachedIds) {
        if (!openIds.includes(cachedId)) {
          clearProjectCache(cachedId)
        }
      }
    })
  })
}

export { routeCache, setRouteCache }
