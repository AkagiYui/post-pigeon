// 路由状态缓存 Hook
// 提供 createCachedSignal / createCachedStore 替代原生 createSignal / createStore，
// 它们会自动注册到缓存系统，组件卸载时自动保存、挂载时自动恢复。
// 新增状态变量只需改声明处，无需手动维护 collect / restore 逻辑。
import { useParams } from "@tanstack/solid-router"
import { createSignal, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

import { loadRouteState, saveRouteState } from "@/stores/routeCache"

/**
 * useRouteCache — 为当前项目 + 指定路由名称提供自动状态缓存
 *
 * @param routeName 路由名称（如 "index"、"history"、"settings"），用于区分同一项目下不同页面的缓存
 *
 * @returns
 *   - createCachedSignal / createCachedStore — 替换原生工厂，自动注册缓存
 *   - saveAll / loadAll / autoSaveAll — 手动控制（一般无需直接调用）
 *   - save / load / projectId — 底层方法，特殊场景使用
 *
 * @example
 * ```tsx
 * const cache = useRouteCache("index")
 * // 像使用 createSignal 一样使用，自动具备缓存能力
 * const [treeData, setTreeData] = cache.createCachedSignal<TreeNode[]>("treeData", [])
 * const [state, setState] = cache.createCachedStore("form", { name: "", desc: "" })
 * cache.autoSaveAll() // 卸载时自动保存
 * ```
 */
export function useRouteCache(routeName: string) {
  const params = useParams({ from: "/project/$id" })

  /** 获取当前项目 ID */
  const projectId = () => params().id

  // ---- 内部注册表：记录所有需要缓存的信号/存储 ----
  const registry = new Map<string, { get: () => any; set: (v: any) => void }>()

  /**
   * 创建一个自动缓存的信号（替代 createSignal）
   * @param key    缓存键名，用于序列化/反序列化
   * @param initial 初始值
   */
  function createCachedSignal<T>(key: string, initial: T) {
    const result = createSignal<T>(initial)
    const [get, set] = result
    registry.set(key, {
      get: () => get(),
      set: (v: any) => set(v),
    })
    return result
  }

  /**
   * 创建一个自动缓存的 store（替代 createStore）
   * @param key    缓存键名
   * @param initial 初始值
   */
  function createCachedStore<T extends object>(key: string, initial: T) {
    const result = createStore<T>(initial)
    const [store, setStore] = result
    registry.set(key, {
      get: () => ({ ...store }),
      set: (v: any) => setStore({ ...v }),
    })
    return result
  }

  /**
   * 保存当前所有注册的信号/存储到缓存
   */
  function saveAll(): void {
    const pid = projectId()
    if (!pid) return
    const state: Record<string, unknown> = {}
    for (const [key, { get }] of registry) {
      state[key] = get()
    }
    saveRouteState(pid, routeName, state)
  }

  /**
   * 从缓存中恢复所有已注册的信号/存储
   * @returns 是否成功恢复（有缓存数据）
   */
  function loadAll(): boolean {
    const pid = projectId()
    if (!pid) return false
    const cached = loadRouteState<Record<string, unknown>>(pid, routeName)
    if (!cached) return false
    for (const [key, { set }] of registry) {
      if (Object.prototype.hasOwnProperty.call(cached, key)) {
        set(cached[key])
      }
    }
    return true
  }

  /**
   * 注册组件卸载时的自动保存
   * 在 onMount 中调用，组件销毁时自动保存所有注册状态
   */
  function autoSaveAll(): void {
    onCleanup(() => saveAll())
  }

  /**
   * 手动保存任意状态（不常用）
   */
  function save<T>(state: T): void {
    const pid = projectId()
    if (!pid) return
    saveRouteState(pid, routeName, state)
  }

  /**
   * 手动加载任意状态（不常用）
   */
  function load<T>(): T | undefined {
    const pid = projectId()
    if (!pid) return undefined
    return loadRouteState<T>(pid, routeName)
  }

  return {
    // 自动缓存工厂（推荐）
    createCachedSignal,
    createCachedStore,
    saveAll,
    loadAll,
    autoSaveAll,
    // 底层方法（特殊场景）
    save,
    load,
    projectId,
  }
}
