// 接口管理主界面组件
// 左侧树形面板 + 右侧多 Tab 端点详情编辑器
// 支持未保存的请求标签页和已保存的端点标签页
import { createEffect, createSignal, For, on, onMount, Show } from "solid-js"

import { EndpointAuth, EndpointBodyField, EndpointHeader, EndpointParam } from "@/../bindings/post-pigeon/internal/models"
import type {
  EndpointDetail as EndpointDetailType,
  FolderTree,
  HTTPResponseData,
  ModuleTree,
  OpenAPIPreview,
} from "@/../bindings/post-pigeon/internal/services"
import {
  EndpointService,
  EnvironmentService,
  FolderService,
  HTTPService,
  ImportExportService,
  ModuleService,
  ProjectService,
} from "@/../bindings/post-pigeon/internal/services"
import { SendRequestData } from "@/../bindings/post-pigeon/internal/services"
import { type AuthState, type BodyFieldRow, emptyAuth, type EndpointData, EndpointDetail, type EnvironmentBaseURLOption, type HeaderRow, type ParamRow, type ResponseData } from "@/components/endpoint/EndpointDetail"
import { EndpointTree, type TreeNode } from "@/components/endpoint/EndpointTree"
import { FolderTreeSelector } from "@/components/endpoint/FolderTreeSelector"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SplitPane } from "@/components/ui/split-pane"
import { Tabs } from "@/components/ui/tabs"
import { useHotkey } from "@/hooks/useHotkey"
import { t } from "@/hooks/useI18n"
import { useRouteCache } from "@/hooks/useRouteCache"
import { type BodyType, type HTTPMethod } from "@/lib/types"
import { baseUrlVersion, currentEnvironmentIds, getCurrentEnvironmentId, getProjectEnvironments, notifyBaseUrlsChanged, setCurrentEnvironment, setProjectEnvironmentsList } from "@/stores/app"

// ---- 类型定义 ----

/** 请求标签页：可以是未保存的请求或已保存的端点 */
export interface RequestTab {
  id: string
  name: string
  method: HTTPMethod
  saved: boolean
  dirty: boolean
}

interface UnsavedRequestData {
  id: string
  name: string
  method: HTTPMethod
  path: string
  bodyType: BodyType
  bodyContent: string
  contentType: string
  timeout: number
  followRedirects: boolean
  baseUrl: string
  params: ParamRow[]
  headers: HeaderRow[]
  bodyFields: BodyFieldRow[]
  auth: AuthState
  preRequestScript: string
  postResponseScript: string
}

let tempIdCounter = 0
function generateTempId(): string {
  tempIdCounter++
  return `__unsaved_${tempIdCounter}_${Date.now()}`
}

// ---- 编辑态行类型 ⇄ 后端绑定模型的相互转换 ----

function toParamModels(rows: ParamRow[]): EndpointParam[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointParam({
    type: "query", name: r.name, value: r.value, description: r.description, enabled: r.enabled,
  }))
}

function toHeaderModels(rows: HeaderRow[]): EndpointHeader[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointHeader({
    name: r.name, value: r.value, description: r.description, enabled: r.enabled,
  }))
}

function toBodyFieldModels(rows: BodyFieldRow[]): EndpointBodyField[] {
  return rows.filter(r => r.name.trim()).map(r => new EndpointBodyField({
    name: r.name,
    fieldType: r.fieldType,
    enabled: r.enabled,
    // 文件字段把文件名与 base64 内容打包进 value，后端按约定解析
    value: r.fieldType === "file"
      ? JSON.stringify({ fileName: r.fileName || "", content: r.fileContent || "" })
      : r.value,
  }))
}

function toAuthModel(a: AuthState): EndpointAuth | null {
  if (!a || a.type === "none") return null
  const data = a.type === "basic"
    ? JSON.stringify({ username: a.username, password: a.password })
    : JSON.stringify({ token: a.token })
  return new EndpointAuth({ type: a.type, data })
}

function fromParamModels(arr?: EndpointParam[] | null): ParamRow[] {
  return (arr || []).map(p => ({ id: crypto.randomUUID(), name: p.name, value: p.value, description: p.description, enabled: p.enabled }))
}

function fromHeaderModels(arr?: EndpointHeader[] | null): HeaderRow[] {
  return (arr || []).map(h => ({ id: crypto.randomUUID(), name: h.name, value: h.value, description: h.description, enabled: h.enabled }))
}

function fromBodyFieldModels(arr?: EndpointBodyField[] | null): BodyFieldRow[] {
  return (arr || []).map(f => {
    const fieldType: "text" | "file" = f.fieldType === "file" ? "file" : "text"
    const row: BodyFieldRow = { id: crypto.randomUUID(), name: f.name, value: f.value, fieldType, enabled: f.enabled }
    if (fieldType === "file") {
      try {
        const parsed = JSON.parse(f.value)
        row.fileName = parsed.fileName || ""
        row.fileContent = parsed.content || ""
        row.value = ""
      } catch {
        // 兼容旧数据：value 直接是文件名
        row.fileName = f.value
        row.fileContent = ""
      }
    }
    return row
  })
}

function fromAuthModel(a?: EndpointAuth | null): AuthState {
  if (!a || !a.type || a.type === "none") return emptyAuth()
  let d: { username?: string; password?: string; token?: string } = {}
  try { d = a.data ? JSON.parse(a.data) : {} } catch { d = {} }
  return {
    type: a.type === "basic" || a.type === "bearer" ? a.type : "none",
    username: d.username || "", password: d.password || "", token: d.token || "",
  }
}

export interface ApiManagementProps {
  projectId: string
  modules: any[]
}

/**
 * ApiManagement 接口管理主界面
 */
export function ApiManagement(props: ApiManagementProps) {
  // ---- 路由状态缓存（自动保存/恢复所有 createCachedSignal/createCachedStore） ----
  const cache = useRouteCache("index")

  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false)
  // 以下使用 createCachedSignal 的信号会自动缓存，新增状态只需改声明处
  const [treeData, setTreeData] = cache.createCachedSignal<TreeNode[]>("treeData", [])
  const [requestTabs, setRequestTabs] = cache.createCachedSignal<RequestTab[]>("requestTabs", [])
  const [activeTabId, setActiveTabId] = cache.createCachedSignal<string | null>("activeTabId", null)
  const [responseData, setResponseData] = cache.createCachedSignal<ResponseData | null>("responseData", null)
  const [expandedIds, setExpandedIds] = cache.createCachedSignal<string[]>("expandedIds", [])
  const [unsavedRequests, setUnsavedRequests] = cache.createCachedSignal<Record<string, UnsavedRequestData>>("unsavedRequests", {})
  // 空的端点数据默认值
  const emptyEndpoint: EndpointData = {
    id: "", name: "", method: "GET" as HTTPMethod, path: "",
    bodyType: "none" as BodyType, bodyContent: "", contentType: "",
    timeout: 30000, followRedirects: true, baseUrl: "",
    params: [], headers: [], bodyFields: [], auth: emptyAuth(),
    preRequestScript: "", postResponseScript: "",
  }
  // 使用 createCachedStore 替代 createStore，自动缓存且保持细粒度响应式
  const [endpointData, setEndpointData] = cache.createCachedStore<EndpointData>("endpointData", { ...emptyEndpoint })
  const [sending, setSending] = createSignal(false)
  const [saveDialogOpen, setSaveDialogOpen] = createSignal(false)
  const [saveName, setSaveName] = createSignal("")
  const [selectedSaveLocation, setSelectedSaveLocation] = cache.createCachedSignal<string>("selectedSaveLocation", "")
  // 保存对话框中文件夹树的展开状态（用 string[] 序列化，运行时转为 Set）
  const [saveFolderExpandedIds, setSaveFolderExpandedIds] = cache.createCachedSignal<string[]>("saveFolderExpandedIds", [])
  const [saving, setSaving] = createSignal(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = createSignal(false)
  const [pendingCloseTabId, setPendingCloseTabId] = createSignal<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false)
  const [deletingEndpointId, setDeletingEndpointId] = createSignal<string | null>(null)
  const [deleting, setDeleting] = createSignal(false)
  const [createFolderOpen, setCreateFolderOpen] = createSignal(false)
  const [newFolderName, setNewFolderName] = createSignal("")
  const [createModuleOpen, setCreateModuleOpen] = createSignal(false)
  const [newModuleName, setNewModuleName] = createSignal("")
  // 新建文件夹对话框：父级位置选择（默认点击的文件夹，否则根模块）
  const [createFolderLocation, setCreateFolderLocation] = createSignal<string>("")
  const [createFolderExpandedIds, setCreateFolderExpandedIds] = createSignal<string[]>([])
  // 重命名对话框
  const [renameOpen, setRenameOpen] = createSignal(false)
  const [renameNode, setRenameNode] = createSignal<TreeNode | null>(null)
  const [renameValue, setRenameValue] = createSignal("")
  const [renaming, setRenaming] = createSignal(false)
  // 移动对话框
  const [moveOpen, setMoveOpen] = createSignal(false)
  const [moveNode, setMoveNode] = createSignal<TreeNode | null>(null)
  const [moveTargetId, setMoveTargetId] = createSignal<string>("")
  const [moveExpandedIds, setMoveExpandedIds] = createSignal<string[]>([])
  const [moving, setMoving] = createSignal(false)
  // 树节点删除确认对话框（模块/文件夹/端点通用）
  const [treeDeleteOpen, setTreeDeleteOpen] = createSignal(false)
  const [treeDeleteNode, setTreeDeleteNode] = createSignal<TreeNode | null>(null)
  const [treeDeleting, setTreeDeleting] = createSignal(false)
  // OpenAPI 导入对话框
  const [openApiOpen, setOpenApiOpen] = createSignal(false)
  const [openApiModuleId, setOpenApiModuleId] = createSignal<string>("")
  const [openApiJson, setOpenApiJson] = createSignal<string>("")
  const [openApiPreview, setOpenApiPreview] = createSignal<OpenAPIPreview | null>(null)
  const [openApiOverwrite, setOpenApiOverwrite] = createSignal(false)
  // 覆盖模块名称（默认开启，仅当文档提供标题且与当前不同时展示）
  const [openApiOverwriteModuleName, setOpenApiOverwriteModuleName] = createSignal(true)
  // 导入环境与前置 URL（默认开启，仅当文档提供 servers 时展示）
  const [openApiImportServers, setOpenApiImportServers] = createSignal(true)
  const [openApiImporting, setOpenApiImporting] = createSignal(false)
  const [openApiError, setOpenApiError] = createSignal("")
  // 当前端点所属模块的所有环境前置 URL 列表（供环境切换下拉使用）
  const [environmentBaseUrls, setEnvironmentBaseUrls] = createSignal<EnvironmentBaseURLOption[]>([])

  // ---- 加载项目树数据 ----
  const loadTree = async () => {
    try {
      const tree = await ProjectService.GetProjectTree(props.projectId)
      setTreeData((tree || []).map(mapModule))
    } catch (e) {
      console.error("加载项目树失败", e)
    }
  }

  // ---- 初始化：优先恢复缓存，否则加载树数据 ----
  onMount(async () => {
    if (!cache.loadAll()) {
      await loadTree()
    }
  })
  // 组件卸载时自动保存所有注册的缓存状态
  cache.autoSaveAll()

  // ---- 环境切换或 baseUrl 设置变更时，响应式更新当前端点的 baseUrl ----
  createEffect(on(
    () => [currentEnvironmentIds()[props.projectId], baseUrlVersion(), activeTabId()] as const,
    async ([envId]) => {
      const epId = endpointData.id
      // 仅对已保存的端点生效（树中可找到其所属模块）
      if (!epId || !envId) return
      const moduleId = findModuleIdByNodeId(treeData(), epId)
      if (!moduleId) return
      try {
        const urls = await ModuleService.GetModuleBaseURLs(moduleId)
        const matched = urls.find(u => u.environmentId === envId)
        setEndpointData({ baseUrl: matched?.baseUrl || "" } as Partial<EndpointData>)
        // 构建环境前置 URL 选项列表，供 Badge 下拉切换使用
        const envs = getProjectEnvironments(props.projectId)
        const options: EnvironmentBaseURLOption[] = urls.map(u => ({
          environmentId: u.environmentId,
          environmentName: envs.find((e: any) => e.id === u.environmentId)?.name || u.environmentId,
          baseUrl: u.baseUrl,
        }))
        setEnvironmentBaseUrls(options)
      } catch { /* 获取 baseUrl 失败时忽略 */ }
    },
  ))

  // ---- 环境切换回调（从 EndpointDetail 的 Badge 下拉触发） ----
  const handleEnvironmentChange = (environmentId: string) => {
    setCurrentEnvironment(props.projectId, environmentId)
  }

  // ---- 打开创建文件夹对话框 ----
  // 默认选中点击的模块/文件夹节点作为父级；无则回退到第一个模块
  const openCreateFolder = (parentId: string | undefined, _type: "module" | "folder") => {
    setNewFolderName("")
    // 计算默认父级位置
    let location = parentId && findNodeInTree(treeData(), parentId) ? parentId : ""
    if (!location) location = getEffectiveSaveLocation()
    setCreateFolderLocation(location)
    // 展开到默认位置，方便用户看到当前选择
    if (location) {
      const ancestors = findAncestorIds(treeData(), location) || []
      setCreateFolderExpandedIds([...new Set([...ancestors, location])])
    }
    setCreateFolderOpen(true)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName().trim()
    if (!name) return

    try {
      // 从选中的树节点解析目标模块与父文件夹
      const location = createFolderLocation()
      if (!location) { console.error(t("module.notSelected")); return }
      const { moduleId, folderId } = resolveSaveLocation(location)
      if (!moduleId) {
        console.error("无法确定所属模块 ID")
        return
      }
      await FolderService.CreateFolder(moduleId, folderId ?? null, name)
      setCreateFolderOpen(false)
      await loadTree()
    } catch (e) {
      console.error("创建文件夹失败", e)
    }
  }

  // ---- 打开创建模块对话框 ----
  const openCreateModule = () => {
    setNewModuleName("")
    setCreateModuleOpen(true)
  }

  const handleCreateModule = async () => {
    const name = newModuleName().trim()
    if (!name) return

    try {
      await ModuleService.CreateModule(props.projectId, name)
      setCreateModuleOpen(false)
      await loadTree()
    } catch (e) {
      console.error("创建模块失败", e)
    }
  }

  // ---- 树映射函数 ----
  const mapModule = (m: ModuleTree): TreeNode => ({
    id: m.id, type: "module", name: m.name,
    children: [
      ...(m.folders || []).map(mapFolder),
      ...(m.endpoints || []).map(mapEndpoint),
    ],
  })

  const mapFolder = (f: FolderTree): TreeNode => ({
    id: f.id, type: "folder", name: f.name,
    children: [
      ...(f.children || []).map(mapFolder),
      ...(f.endpoints || []).map(mapEndpoint),
    ],
  })

  const mapEndpoint = (e: any): TreeNode => ({
    id: e.id, type: "endpoint", name: e.name, method: e.method as HTTPMethod,
  })

  /** 通过节点 ID 查找所属模块 ID */
  const findModuleIdByNodeId = (nodes: TreeNode[], targetId: string): string | undefined => {
    for (const node of nodes) {
      if (node.id === targetId && node.type === "module") return node.id
      if (node.children) {
        if (node.type === "module" && findInChildren(node.children, targetId)) return node.id
        const result = findModuleIdByNodeId(node.children, targetId)
        if (result) return result
      }
    }
    return undefined
  }

  const findInChildren = (children: TreeNode[], targetId: string): boolean => {
    for (const child of children) {
      if (child.id === targetId) return true
      if (child.children && findInChildren(child.children, targetId)) return true
    }
    return false
  }

  // ---- 解析保存位置（通过选中的节点 ID 查找所属模块和文件夹） ----
  const resolveSaveLocation = (nodeId: string): { moduleId: string; folderId: string | undefined } => {
    // 先检查是否为模块节点
    const isModule = treeData().some(n => n.id === nodeId && n.type === "module")
    if (isModule) return { moduleId: nodeId, folderId: undefined }
    // 否则是文件夹节点，查找其所属模块
    const moduleId = findModuleIdByNodeId(treeData(), nodeId)
    return { moduleId: moduleId || "", folderId: nodeId }
  }

  // ---- 获取有效的保存位置（优先使用缓存值，无效时回退到第一个模块） ----
  const getEffectiveSaveLocation = (): string => {
    const data = treeData()
    if (data.length === 0) return ""
    const cached = selectedSaveLocation()
    // 检查缓存的节点是否仍然存在于树中
    if (cached && findNodeInTree(data, cached)) return cached
    // 回退到第一个模块
    if (data[0].type === "module") return data[0].id
    return ""
  }

  /** 在树中递归查找指定 ID 的节点 */
  const findNodeInTree = (nodes: TreeNode[], targetId: string): boolean => {
    for (const node of nodes) {
      if (node.id === targetId) return true
      if (node.children && findNodeInTree(node.children, targetId)) return true
    }
    return false
  }

  /** 查找指定节点在树中的所有祖先 ID（从根到父节点，不包含自身） */
  const findAncestorIds = (nodes: TreeNode[], targetId: string, ancestors: string[] = []): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return ancestors
      if (node.children) {
        const result = findAncestorIds(node.children, targetId, [...ancestors, node.id])
        if (result) return result
      }
    }
    return null
  }

  /** 将 string[] 转为 Set<string>，用于 FolderTreeSelector */
  const saveExpandedSet = () => new Set(saveFolderExpandedIds())

  /** 将 Set<string> 转为 string[] 并保存 */
  const handleSaveExpandedChange = (ids: Set<string>) => {
    setSaveFolderExpandedIds([...ids])
  }

  /** 确保指定节点的所有祖先 ID 都在展开集合中 */
  const ensureAncestorsExpanded = (nodeId: string) => {
    if (!nodeId) return
    const ancestors = findAncestorIds(treeData(), nodeId)
    if (!ancestors || ancestors.length === 0) return
    const current = new Set(saveFolderExpandedIds())
    let changed = false
    for (const id of ancestors) {
      if (!current.has(id)) {
        current.add(id)
        changed = true
      }
    }
    if (changed) setSaveFolderExpandedIds([...current])
  }

  /** 项目默认模块 ID（树中第一个模块），默认模块不可删除、不可移动 */
  const defaultModuleId = () => {
    const d = treeData()
    return d.length > 0 && d[0].type === "module" ? d[0].id : undefined
  }

  /** 递归收集某节点自身及其所有后代 ID（用于移动时禁止选中自身/子孙作为目标） */
  const collectSubtreeIds = (node: TreeNode): Set<string> => {
    const ids = new Set<string>()
    const walk = (n: TreeNode) => {
      ids.add(n.id)
      n.children?.forEach(walk)
    }
    walk(node)
    return ids
  }

  // ---- 创建未保存请求 ----
  // parentNodeId：右键/菜单发起时点击的模块或文件夹节点，作为默认保存位置
  const createUnsavedTab = (parentNodeId?: string) => {
    // 记住默认保存位置：优先点击的节点，否则回退到第一个模块
    if (parentNodeId && findNodeInTree(treeData(), parentNodeId)) {
      setSelectedSaveLocation(parentNodeId)
      ensureAncestorsExpanded(parentNodeId)
    }
    const tempId = generateTempId()
    const unsaved: UnsavedRequestData = {
      id: tempId, name: t("endpoint.newRequest"), method: "GET" as HTTPMethod,
      path: "/", bodyType: "none" as BodyType, bodyContent: "", contentType: "",
      timeout: 30000, followRedirects: true, baseUrl: "",
      params: [], headers: [], bodyFields: [], auth: emptyAuth(),
      preRequestScript: "", postResponseScript: "",
    }
    setUnsavedRequests(prev => ({ ...prev, [tempId]: unsaved }))
    setRequestTabs(prev => [...prev, { id: tempId, name: unsaved.name, method: unsaved.method, saved: false, dirty: false }])
    setActiveTabId(tempId)
    setEndpointData({
      id: tempId, name: unsaved.name, method: unsaved.method, path: unsaved.path,
      bodyType: unsaved.bodyType, bodyContent: unsaved.bodyContent, contentType: unsaved.contentType,
      timeout: unsaved.timeout, followRedirects: unsaved.followRedirects, baseUrl: unsaved.baseUrl,
      params: [], headers: [], bodyFields: [], auth: emptyAuth(),
      preRequestScript: "", postResponseScript: "",
    } as EndpointData)
    setResponseData(null)
  }

  // ---- 选择已保存的端点 ----
  const handleSelectNode = async (node: TreeNode) => {
    if (node.type !== "endpoint") return
    const existing = requestTabs().findIndex(t => t.id === node.id)
    if (existing >= 0) {
      setActiveTabId(node.id)
      await loadSavedEndpointData(node.id)
      return
    }
    setRequestTabs(prev => [...prev, { id: node.id, name: node.name, method: node.method!, saved: true, dirty: false }])
    setActiveTabId(node.id)
    await loadSavedEndpointData(node.id)
  }

  const loadSavedEndpointData = async (endpointId: string) => {
    try {
      const detail = await EndpointService.GetEndpoint(endpointId)
      if (detail) {
        // 根据端点所属模块和当前环境，获取前置 baseUrl
        let baseUrl = ""
        const envId = getCurrentEnvironmentId(props.projectId)
        if (detail.moduleId && envId) {
          try {
            const urls = await ModuleService.GetModuleBaseURLs(detail.moduleId)
            const matched = urls.find(u => u.environmentId === envId)
            baseUrl = matched?.baseUrl || ""
          } catch { /* 获取 baseUrl 失败时不阻塞加载 */ }
        }
        setEndpointData({
          id: detail.id, name: detail.name, method: detail.method as HTTPMethod,
          path: detail.path, bodyType: detail.bodyType as BodyType, bodyContent: detail.bodyContent,
          contentType: detail.contentType, timeout: detail.timeout, followRedirects: detail.followRedirects,
          baseUrl,
          params: fromParamModels(detail.params),
          headers: fromHeaderModels(detail.headers),
          bodyFields: fromBodyFieldModels(detail.bodyFields),
          auth: fromAuthModel(detail.auth),
          preRequestScript: detail.preRequestScript || "",
          postResponseScript: detail.postResponseScript || "",
        } as EndpointData)
        if (detail.response) {
          const ti = detail.response.timing ? JSON.parse(detail.response.timing) : { total: 0, dnsLookup: 0, tlsHandshake: 0, tcpConnect: 0, ttfb: 0 }
          setResponseData({
            statusCode: detail.response.statusCode,
            timing: { total: ti.total || 0, dnsLookup: ti.dnsLookup || 0, tlsHandshake: ti.tlsHandshake || 0, tcpConnect: ti.tcpConnect || 0, ttfb: ti.ttfb || 0 },
            size: detail.response.size, body: detail.response.body, headers: detail.response.headers as any,
            cookies: detail.response.cookies as any || [], contentType: detail.response.contentType,
            actualRequest: detail.response.actualRequest,
          })
        } else setResponseData(null)
      }
    } catch (e) { console.error("加载端点详情失败", e) }
  }

  // ---- 切换标签页 ----
  const handleTabChange = async (tabId: string) => {
    setActiveTabId(tabId)
    const tab = requestTabs().find(t => t.id === tabId)
    if (!tab) return
    if (tab.saved) await loadSavedEndpointData(tabId)
    else {
      const unsaved = unsavedRequests()[tabId]
      if (unsaved) setEndpointData({
        id: unsaved.id, name: unsaved.name, method: unsaved.method, path: unsaved.path,
        bodyType: unsaved.bodyType, bodyContent: unsaved.bodyContent, contentType: unsaved.contentType,
        timeout: unsaved.timeout, followRedirects: unsaved.followRedirects, baseUrl: unsaved.baseUrl,
        params: unsaved.params ?? [], headers: unsaved.headers ?? [],
        bodyFields: unsaved.bodyFields ?? [], auth: unsaved.auth ?? emptyAuth(),
        preRequestScript: unsaved.preRequestScript ?? "", postResponseScript: unsaved.postResponseScript ?? "",
      } as EndpointData)
    }
  }

  // ---- 数据变更回调 ----
  // 使用 createStore 的合并更新，避免创建新对象引用导致组件重挂载
  const handleDataChange = (data: Partial<EndpointData>) => {
    const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct) return
    // 合并更新到 store（不创建新对象引用，避免组件重挂载）
    setEndpointData(data as Partial<EndpointData>)
    if (!ct.saved) {
      // 从 store 获取当前完整数据保存到未保存请求记录
      setUnsavedRequests(p => ({ ...p, [ct.id]: { ...p[ct.id], ...endpointData, id: ct.id } }))
      if (data.method || data.name) setRequestTabs(pt => pt.map(t => t.id === ct.id ? { ...t, method: (data.method as HTTPMethod) || t.method, name: data.name || t.name } : t))
    } else {
      setRequestTabs(pt => pt.map(t => t.id === ct.id ? { ...t, dirty: true } : t))
    }
  }

  // ---- 发送请求 ----
  const handleSend = async () => {
    const ep = endpointData
    if (!ep.id) return
    setSending(true)
    try {
      const sendData = new SendRequestData()
      const ct = requestTabs().find(t => t.id === activeTabId())
      sendData.endpointId = ct?.saved ? ep.id : ""
      // 已保存端点：带上所属模块 ID，后端据此记录请求历史
      sendData.moduleId = ct?.saved ? (findModuleIdByNodeId(treeData(), ep.id) || "") : ""
      sendData.environmentId = getCurrentEnvironmentId(props.projectId)
      sendData.method = ep.method; sendData.baseUrl = ep.baseUrl; sendData.path = ep.path
      sendData.headers = toHeaderModels(ep.headers); sendData.params = toParamModels(ep.params)
      sendData.bodyType = ep.bodyType
      sendData.bodyContent = ep.bodyContent; sendData.contentType = ep.contentType
      sendData.bodyFields = toBodyFieldModels(ep.bodyFields); sendData.auth = toAuthModel(ep.auth)
      sendData.timeout = ep.timeout; sendData.followRedirects = ep.followRedirects
      sendData.preRequestScript = ep.preRequestScript; sendData.postResponseScript = ep.postResponseScript

      const resp = await HTTPService.SendRequest(sendData)
      if (resp) {
        setResponseData({
          statusCode: resp.statusCode,
          timing: { total: resp.timing?.total || 0, dnsLookup: resp.timing?.dnsLookup || 0, tlsHandshake: resp.timing?.tlsHandshake || 0, tcpConnect: resp.timing?.tcpConnect || 0, ttfb: resp.timing?.ttfb || 0 },
          size: resp.size, body: resp.body, rawBody: resp.rawBody, headers: resp.headers as any,
          cookies: resp.cookies as any || [], contentType: resp.contentType,
          actualRequest: resp.actualRequest,
          scripts: (resp.scripts as any) || undefined,
        })
      }
    } catch (e) {
      // 请求失败（如协议错误、连接失败、超时等）：将错误信息展示到响应框，而非仅打印到控制台
      console.error("发送请求失败", e)
      const message = e instanceof Error ? e.message : String(e)
      setResponseData({
        statusCode: 0,
        timing: { total: 0, dnsLookup: 0, tlsHandshake: 0, tcpConnect: 0, ttfb: 0 },
        size: 0, body: "", headers: {}, cookies: [], contentType: "",
        actualRequest: null,
        error: message,
      })
    } finally { setSending(false) }
  }

  // ---- 保存逻辑 ----
  const handleSave = () => {
    const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct) return
    if (!ct.saved) {
      setSaveName(endpointData.name !== t("endpoint.newRequest") ? endpointData.name : "")
      // 优先使用上次记住的位置，无效则回退到第一个模块
      const location = getEffectiveSaveLocation()
      setSelectedSaveLocation(location)
      // 确保选中节点的所有祖先都已展开，让用户能看到选中的位置
      ensureAncestorsExpanded(location)
      setSaveDialogOpen(true)
    } else {
      handleSaveSavedEndpoint()
    }
  }

  const handleSaveSavedEndpoint = async () => {
    const ep = endpointData
    if (!ep.id) return
    try {
      await EndpointService.SaveEndpointData({
        id: ep.id, name: ep.name, method: ep.method, path: ep.path,
        bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
        timeout: ep.timeout, followRedirects: ep.followRedirects,
        preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
        params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
        headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
      })
      setRequestTabs(pt => pt.map(t => t.id === ep.id ? { ...t, dirty: false } : t))
      await loadTree()
    } catch (e) { console.error("保存端点失败", e) }
  }

  const handleSaveToProject = async () => {
    const ep = endpointData; const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct || ct.saved) return
    const name = saveName().trim()
    if (!name) return
    setSaving(true)
    try {
      const { moduleId, folderId } = resolveSaveLocation(selectedSaveLocation())
      if (!moduleId) { console.error(t("module.notSelected")); return }
      const created = await EndpointService.CreateFullEndpoint(moduleId, folderId ?? null, {
        id: "", name, method: ep.method, path: ep.path,
        bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
        timeout: ep.timeout, followRedirects: ep.followRedirects,
        preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
        params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
        headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
      })
      if (created) {
        setRequestTabs(pt => pt.map(t => t.id === ct.id ? { id: created.id, name, method: ep.method as HTTPMethod, saved: true, dirty: false } : t))
        setEndpointData({ id: created.id, name } as EndpointData)
        setUnsavedRequests(p => { const n = { ...p }; delete n[ct.id]; return n })
        setActiveTabId(created.id); setSaveDialogOpen(false); await loadTree()
      }
    } catch (e) { console.error("保存到项目失败", e) } finally { setSaving(false) }
  }

  // ---- 关闭标签页 ----
  const handleCloseTab = (tabId: string) => {
    const tab = requestTabs().find(t => t.id === tabId)
    if (!tab) return
    if (!tab.saved || tab.dirty) { setPendingCloseTabId(tabId); setCloseConfirmOpen(true) } else { closeTab(tabId) }
  }

  const handleConfirmDiscard = () => {
    const tid = pendingCloseTabId()
    if (tid) closeTab(tid)
    setCloseConfirmOpen(false); setPendingCloseTabId(null)
  }

  const handleSaveAndClose = async () => {
    const tid = pendingCloseTabId(); const tab = requestTabs().find(t => t.id === tid)
    if (!tab || !tid) return
    if (!tab.saved) {
      setCloseConfirmOpen(false)
      const ep = endpointData
      if (ep.id) {
        setSaveName(ep.name !== t("endpoint.newRequest") ? ep.name : "")
        // 优先使用上次记住的位置，无效则回退到第一个模块
        const location = getEffectiveSaveLocation()
        setSelectedSaveLocation(location)
        // 确保选中节点的所有祖先都已展开
        ensureAncestorsExpanded(location)
        setSaveDialogOpen(true)
      }
    } else {
      await handleSaveSavedEndpoint(); closeTab(tid)
      setCloseConfirmOpen(false); setPendingCloseTabId(null)
    }
  }

  const closeTab = (tabId: string) => {
    setRequestTabs(prev => prev.filter(t => t.id !== tabId))
    setUnsavedRequests(prev => { const n = { ...prev }; delete n[tabId]; return n })
    if (activeTabId() === tabId) {
      const remaining = requestTabs().filter(t => t.id !== tabId)
      if (remaining.length > 0) {
        const nt = remaining[remaining.length - 1]
        setActiveTabId(nt.id); handleTabChange(nt.id)
      } else { setActiveTabId(null); setEndpointData({ ...emptyEndpoint }); setResponseData(null) }
    }
  }

  // ---- 删除端点 ----
  const handleDelete = () => {
    const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct) return
    if (!ct.saved) { if (activeTabId()) closeTab(activeTabId()!); return }
    setDeletingEndpointId(ct.id); setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    const id = deletingEndpointId()
    if (!id) return
    setDeleting(true)
    try { await EndpointService.DeleteEndpoint(id); closeTab(id); setDeleteConfirmOpen(false); setDeletingEndpointId(null); await loadTree() } catch (e) { console.error("删除端点失败", e) } finally { setDeleting(false) }
  }

  // ---- 树节点操作：重命名（模块 / 文件夹 / 端点） ----
  const handleTreeRename = (node: TreeNode) => {
    setRenameNode(node)
    setRenameValue(node.name)
    setRenameOpen(true)
  }

  const confirmRename = async () => {
    const node = renameNode()
    const name = renameValue().trim()
    if (!node || !name) return
    setRenaming(true)
    try {
      if (node.type === "module") await ModuleService.UpdateModule(node.id, name)
      else if (node.type === "folder") await FolderService.UpdateFolder(node.id, name)
      else await EndpointService.RenameEndpoint(node.id, name)
      // 同步已打开标签页与当前编辑区的名称
      setRequestTabs(pt => pt.map(t => t.id === node.id ? { ...t, name } : t))
      if (endpointData.id === node.id) setEndpointData({ name } as Partial<EndpointData>)
      setRenameOpen(false); setRenameNode(null)
      await loadTree()
    } catch (e) { console.error("重命名失败", e) } finally { setRenaming(false) }
  }

  // ---- 树节点操作：复制（模块 / 文件夹 / 端点） ----
  const handleTreeCopy = async (node: TreeNode) => {
    try {
      if (node.type === "module") await ModuleService.DuplicateModule(node.id)
      else if (node.type === "folder") await FolderService.DuplicateFolder(node.id)
      else await EndpointService.DuplicateEndpoint(node.id)
      await loadTree()
    } catch (e) { console.error("复制失败", e) }
  }

  // ---- 树节点操作：删除（模块 / 文件夹 / 端点） ----
  const handleTreeDelete = (node: TreeNode) => {
    // 默认模块不可删除
    if (node.type === "module" && node.id === defaultModuleId()) return
    setTreeDeleteNode(node)
    setTreeDeleteOpen(true)
  }

  const confirmTreeDelete = async () => {
    const node = treeDeleteNode()
    if (!node) return
    setTreeDeleting(true)
    try {
      if (node.type === "module") await ModuleService.DeleteModule(node.id)
      else if (node.type === "folder") await FolderService.DeleteFolder(node.id)
      else await EndpointService.DeleteEndpoint(node.id)
      // 关闭受影响的已打开标签页（被删端点本身，或被删容器内的端点）
      if (node.type === "endpoint") {
        if (requestTabs().some(t => t.id === node.id)) closeTab(node.id)
      } else {
        const subtree = collectSubtreeIds(node)
        requestTabs().filter(t => subtree.has(t.id)).forEach(t => closeTab(t.id))
      }
      setTreeDeleteOpen(false); setTreeDeleteNode(null)
      await loadTree()
    } catch (e) { console.error("删除失败", e) } finally { setTreeDeleting(false) }
  }

  // ---- 树节点操作：移动（文件夹 / 端点，模块不可移动） ----
  const handleTreeMove = (node: TreeNode) => {
    if (node.type === "module") return
    setMoveNode(node)
    setMoveTargetId("")
    // 展开到当前所在位置，方便用户定位
    const ancestors = findAncestorIds(treeData(), node.id) || []
    setMoveExpandedIds([...ancestors])
    setMoveOpen(true)
  }

  const confirmMove = async () => {
    const node = moveNode()
    const target = moveTargetId()
    if (!node || !target) return
    setMoving(true)
    try {
      const { moduleId, folderId } = resolveSaveLocation(target)
      if (!moduleId) return
      if (node.type === "endpoint") await EndpointService.MoveEndpoint(node.id, moduleId, folderId ?? null)
      else if (node.type === "folder") await FolderService.MoveFolderTo(node.id, moduleId, folderId ?? null)
      setMoveOpen(false); setMoveNode(null)
      await loadTree()
    } catch (e) { console.error("移动失败", e) } finally { setMoving(false) }
  }

  /** 移动目标选择器中禁止选中的节点（被移动节点自身及其后代） */
  const moveDisabledIds = () => {
    const n = moveNode()
    return n ? collectSubtreeIds(n) : new Set<string>()
  }

  // ---- OpenAPI 导入：选择文件 → 预览 → 确认导入 ----
  const handleImportOpenAPI = (node: TreeNode) => {
    if (node.type !== "module") return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json,.json"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setOpenApiModuleId(node.id)
      setOpenApiOverwrite(false)
      setOpenApiOverwriteModuleName(true)
      setOpenApiImportServers(true)
      setOpenApiError("")
      setOpenApiPreview(null)
      setOpenApiJson("")
      setOpenApiOpen(true)
      try {
        const text = await file.text()
        setOpenApiJson(text)
        const preview = await ImportExportService.PreviewOpenAPIImport(node.id, text)
        setOpenApiPreview(preview)
      } catch (e) {
        console.error("解析接口文档失败", e)
        setOpenApiError(t("openapi.parseFailed"))
      }
    }
    input.click()
  }

  const confirmImportOpenAPI = async () => {
    const moduleId = openApiModuleId()
    if (!moduleId || !openApiJson()) return
    setOpenApiImporting(true)
    try {
      await ImportExportService.ImportOpenAPIToModule(moduleId, openApiJson(), {
        overwrite: openApiOverwrite(),
        overwriteModuleName: openApiOverwriteModuleName(),
        importServers: openApiImportServers(),
      })
      setOpenApiOpen(false)
      // 模块名/环境/前置 URL 可能变化：刷新树、项目环境列表，并通知 baseUrl 变更
      await loadTree()
      try {
        const envs = await EnvironmentService.ListEnvironments(props.projectId)
        setProjectEnvironmentsList(props.projectId, envs || [])
      } catch { /* 刷新环境列表失败时忽略 */ }
      notifyBaseUrlsChanged()
    } catch (e) {
      console.error("导入接口文档失败", e)
      setOpenApiError(t("openapi.importFailed"))
    } finally { setOpenApiImporting(false) }
  }

  // ---- 全局快捷键（跨平台，自动适配 Cmd/Ctrl） ----
  useHotkey([
    // 发送请求
    { key: "CmdOrCtrl+Enter", allowInInput: true, handler: () => { if (endpointData.id && !sending()) handleSend() } },
    // 保存当前接口
    { key: "CmdOrCtrl+S", allowInInput: true, handler: () => { if (activeTabId()) handleSave() } },
    // 新建请求
    { key: "CmdOrCtrl+N", allowInInput: true, handler: () => createUnsavedTab() },
  ])

  // ---- 计算属性 ----
  const isActiveTabUnsaved = () => { const t = requestTabs().find(t => t.id === activeTabId()); return t ? !t.saved : false }

  return (
    <>
      <SplitPane
        defaultSize={280} minSize={150} maxSize={500}
        collapsed={sidebarCollapsed()} onCollapsedChange={setSidebarCollapsed}
        left={<div class="flex flex-col h-full border-r border-border">
          <EndpointTree
            data={treeData()} selectedId={activeTabId() || undefined}
            onSelect={handleSelectNode} onCollapse={() => setSidebarCollapsed(true)}
            onCreateModule={openCreateModule}
            onCreateEndpoint={(parentId) => createUnsavedTab(parentId)} onCreateFolder={openCreateFolder}
            onRename={handleTreeRename} onCopy={handleTreeCopy}
            onDelete={handleTreeDelete} onMove={handleTreeMove}
            onImportOpenAPI={handleImportOpenAPI}
            defaultModuleId={defaultModuleId()}
            expandedIds={expandedIds()} onExpandedChange={setExpandedIds}
          />
        </div>}
        right={<div class="h-full">
          <Show when={requestTabs().length > 0}
            fallback={<div class="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <span>{t("endpoint.selectPrompt")}</span>
              <Button onClick={() => createUnsavedTab()} variant="outline">+ {t("endpoint.newRequest")}</Button>
            </div>}
          >
            <Tabs
              tabs={requestTabs().map(tab => ({
                key: tab.id,
                label: <span>{!tab.saved && <span class="text-orange-500 mr-0.5">●</span>}{tab.dirty && <span class="text-orange-500 mr-0.5">·</span>}{tab.method} {tab.name}</span>,
                closable: true,
              }))}
              value={activeTabId() || ""} onChange={handleTabChange} onClose={handleCloseTab}
            >
              {() => endpointData.id ? <EndpointDetail
                endpoint={endpointData} response={responseData()} sending={sending()}
                isUnsaved={isActiveTabUnsaved()} onSend={handleSend} onSave={handleSave}
                onDelete={handleDelete} onChange={handleDataChange}
                currentEnvironmentId={getCurrentEnvironmentId(props.projectId)}
                environmentBaseUrls={environmentBaseUrls()}
                onEnvironmentChange={handleEnvironmentChange}
              /> : null}
            </Tabs>
          </Show>
        </div>}
      />

      {/* 保存到项目对话框 */}
      <Dialog open={saveDialogOpen()} onClose={() => setSaveDialogOpen(false)} title={t("endpoint.saveToProjectTitle")} closeOnEsc closeOnOverlayClick>
        <div class="px-6 py-4 flex flex-col h-[70vh] gap-4">
          <div class="shrink-0"><label class="block text-sm font-medium mb-1.5">{t("endpoint.name")}</label>
            <Input value={saveName()} onInput={e => setSaveName(e.currentTarget.value)} placeholder="GET /users" onKeyDown={e => e.key === "Enter" && handleSaveToProject()} />
          </div>
          <div class="flex-1 min-h-0 flex flex-col"><label class="block text-sm font-medium mb-1.5 shrink-0">{t("endpoint.selectFolder")}</label>
            <FolderTreeSelector
              data={treeData()}
              selectedId={selectedSaveLocation()}
              onSelect={(node) => setSelectedSaveLocation(node.id)}
              expandedIds={saveExpandedSet()}
              onExpandedChange={handleSaveExpandedChange}
              class="flex-1 min-h-0"
            />
            <p class="text-xs text-muted-foreground mt-1 shrink-0">{t("endpoint.saveLocationHint")}</p>
          </div>
          <div class="flex justify-end gap-2 pt-2 shrink-0">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveToProject} disabled={!saveName().trim() || saving()}>{saving() ? t("common.saving") : t("endpoint.save")}</Button>
          </div>
        </div>
      </Dialog>

      {/* 关闭未保存标签页的确认对话框 */}
      <Dialog open={closeConfirmOpen()} onClose={() => { setCloseConfirmOpen(false); setPendingCloseTabId(null) }} title={t("endpoint.unsavedChanges")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <p class="text-sm text-muted-foreground">{t("endpoint.confirmCloseUnsaved")}</p>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setCloseConfirmOpen(false); setPendingCloseTabId(null) }}>{t("common.cancel")}</Button>
            <Button variant="outline" onClick={handleConfirmDiscard}>{t("common.discard")}</Button>
            <Button onClick={handleSaveAndClose}>{t("common.saveAndClose")}</Button>
          </div>
        </div>
      </Dialog>

      {/* 删除端点确认对话框 */}
      <Dialog open={deleteConfirmOpen()} onClose={() => { setDeleteConfirmOpen(false); setDeletingEndpointId(null) }} title={t("endpoint.delete")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <p class="text-sm text-muted-foreground">{t("endpoint.confirmDelete", { name: endpointData.name || "" })}</p>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleConfirmDelete} disabled={deleting()}>{deleting() ? t("common.deleting") : t("common.confirm")}</Button>
          </div>
        </div>
      </Dialog>

      {/* 创建文件夹对话框 */}
      <Dialog open={createFolderOpen()} onClose={() => setCreateFolderOpen(false)} title={t("folder.create")} closeOnEsc closeOnOverlayClick>
        <div class="px-6 py-4 flex flex-col h-[60vh] gap-4">
          <div class="shrink-0">
            <label class="block text-sm font-medium mb-1.5">{t("folder.name")}</label>
            <Input
              value={newFolderName()}
              onInput={(e) => setNewFolderName(e.currentTarget.value)}
              placeholder={t("folder.name")}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <div class="flex-1 min-h-0 flex flex-col">
            <label class="block text-sm font-medium mb-1.5 shrink-0">{t("folder.selectParent")}</label>
            <FolderTreeSelector
              data={treeData()}
              selectedId={createFolderLocation()}
              onSelect={(node) => setCreateFolderLocation(node.id)}
              expandedIds={new Set(createFolderExpandedIds())}
              onExpandedChange={(ids) => setCreateFolderExpandedIds([...ids])}
              class="flex-1 min-h-0"
            />
            <p class="text-xs text-muted-foreground mt-1 shrink-0">{t("folder.selectParentHint")}</p>
          </div>
          <div class="flex justify-end gap-2 pt-2 shrink-0">
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName().trim() || !createFolderLocation()}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={renameOpen()} onClose={() => setRenameOpen(false)} title={t("common.rename")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("common.name")}</label>
            <Input
              value={renameValue()}
              onInput={(e) => setRenameValue(e.currentTarget.value)}
              placeholder={t("common.name")}
              onKeyDown={(e) => e.key === "Enter" && confirmRename()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={confirmRename} disabled={!renameValue().trim() || renaming()}>
              {renaming() ? t("common.saving") : t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 移动到对话框 */}
      <Dialog open={moveOpen()} onClose={() => setMoveOpen(false)} title={t("common.move")} closeOnEsc closeOnOverlayClick>
        <div class="px-6 py-4 flex flex-col h-[60vh] gap-4">
          <div class="flex-1 min-h-0 flex flex-col">
            <label class="block text-sm font-medium mb-1.5 shrink-0">{t("endpoint.selectFolder")}</label>
            <FolderTreeSelector
              data={treeData()}
              selectedId={moveTargetId()}
              onSelect={(node) => setMoveTargetId(node.id)}
              expandedIds={new Set(moveExpandedIds())}
              onExpandedChange={(ids) => setMoveExpandedIds([...ids])}
              disabledIds={moveDisabledIds()}
              class="flex-1 min-h-0"
            />
            <p class="text-xs text-muted-foreground mt-1 shrink-0">{t("move.hint")}</p>
          </div>
          <div class="flex justify-end gap-2 pt-2 shrink-0">
            <Button variant="outline" onClick={() => setMoveOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={confirmMove} disabled={!moveTargetId() || moving()}>
              {moving() ? t("common.saving") : t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 树节点删除确认对话框 */}
      <Dialog open={treeDeleteOpen()} onClose={() => { setTreeDeleteOpen(false); setTreeDeleteNode(null) }} title={t("common.delete")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <p class="text-sm text-muted-foreground">{t("tree.confirmDelete", { name: treeDeleteNode()?.name || "" })}</p>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setTreeDeleteOpen(false); setTreeDeleteNode(null) }}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={confirmTreeDelete} disabled={treeDeleting()}>
              {treeDeleting() ? t("common.deleting") : t("common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* OpenAPI 导入对话框 */}
      <Dialog open={openApiOpen()} onClose={() => setOpenApiOpen(false)} title={t("openapi.importTitle")} closeOnEsc closeOnOverlayClick width="560px">
        <div class="px-6 py-4 flex flex-col h-[70vh] gap-3">
          <Show when={openApiError()}>
            <div class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md shrink-0">{openApiError()}</div>
          </Show>
          <Show when={!openApiError() && !openApiPreview()}>
            <div class="flex-1 flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>
          </Show>
          <Show when={openApiPreview()}>
            {(preview) => (
              <>
                <div class="shrink-0 text-sm text-muted-foreground">
                  {t("openapi.summary", { total: preview().total, dup: preview().duplicateCount })}
                </div>
                {/* 导入选项：模块名称、环境与前置 URL */}
                <div class="shrink-0 flex flex-col gap-2 border border-border rounded-md p-3">
                  {/* 覆盖模块名称（仅当文档提供标题且与当前不同时显示） */}
                  <Show when={preview().moduleName && preview().moduleName !== preview().currentModuleName}>
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={openApiOverwriteModuleName()} onChange={(e) => setOpenApiOverwriteModuleName(e.currentTarget.checked)} />
                      <span>{t("openapi.overwriteModuleName", { name: preview().moduleName })}</span>
                    </label>
                  </Show>
                  {/* 导入环境与前置 URL（仅当文档提供 servers 时显示） */}
                  <Show when={preview().servers.length > 0}>
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={openApiImportServers()} onChange={(e) => setOpenApiImportServers(e.currentTarget.checked)} />
                      <span>{t("openapi.importServers")}</span>
                    </label>
                    {/* 服务器/环境列表 */}
                    <div class="ml-6 flex flex-col gap-1">
                      <For each={preview().servers}>
                        {(srv) => (
                          <div class="flex items-center gap-2 text-xs text-muted-foreground">
                            <span class="shrink-0 font-medium text-foreground">{srv.name || t("openapi.allEnvironments")}</span>
                            <span class="flex-1 min-w-0 truncate font-mono" title={srv.url}>{srv.url || "—"}</span>
                            <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted">
                              {srv.environmentSame ? t("openapi.envExists") : (srv.name ? t("openapi.envNew") : "")}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                  {/* 冲突处理方式选择（仅当存在重复项时显示） */}
                  <Show when={preview().duplicateCount > 0}>
                    <div class="flex flex-col gap-2 pt-1 border-t border-border/50 mt-1">
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="openapi-conflict" checked={!openApiOverwrite()} onChange={() => setOpenApiOverwrite(false)} />
                        <span>{t("openapi.skipDuplicates")}</span>
                      </label>
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="openapi-conflict" checked={openApiOverwrite()} onChange={() => setOpenApiOverwrite(true)} />
                        <span>{t("openapi.overwriteDuplicates")}</span>
                      </label>
                    </div>
                  </Show>
                </div>
                {/* 接口预览列表 */}
                <div class="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-input">
                  <For each={preview().items}>
                    {(item) => (
                      <div class="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-border/50 last:border-b-0">
                        <span class="font-mono text-xs font-semibold w-14 shrink-0 text-accent">{item.method}</span>
                        <span class="flex-1 min-w-0 truncate" title={item.path}>{item.name}</span>
                        <Show when={item.duplicate}>
                          <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">{t("openapi.duplicate")}</span>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </>
            )}
          </Show>
          <div class="flex justify-end gap-2 pt-2 shrink-0">
            <Button variant="outline" onClick={() => setOpenApiOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={confirmImportOpenAPI} disabled={!openApiPreview() || (openApiPreview()?.total ?? 0) === 0 || openApiImporting()}>
              {openApiImporting() ? t("common.saving") : t("openapi.confirmImport")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 创建模块对话框 */}
      <Dialog open={createModuleOpen()} onClose={() => setCreateModuleOpen(false)} title={t("module.create")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("module.name")}</label>
            <Input
              value={newModuleName()}
              onInput={(e) => setNewModuleName(e.currentTarget.value)}
              placeholder={t("module.name")}
              onKeyDown={(e) => e.key === "Enter" && handleCreateModule()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateModuleOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateModule} disabled={!newModuleName().trim()}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
