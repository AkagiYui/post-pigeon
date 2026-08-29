// 接口管理主界面组件
// 左侧树形面板 + 右侧多 Tab 端点详情编辑器
// 支持未保存的请求标签页和已保存的端点标签页
import { createEffect, createSignal, on, onMount, Show } from "solid-js"

import type { ActualRequestInfo, CookieInfo, Endpoint, ResponseExample, ResponseSchema } from "@/../bindings/PostPigeon/internal/models"
import type { CurlRequest } from "@/../bindings/PostPigeon/internal/services"
import type { FolderTree, ModuleTree } from "@/../bindings/PostPigeon/internal/services"
import {
  CurlService,
  EndpointService,
  EnvironmentService,
  FolderService,
  HTTPService,
  ImportExportService,
  ModuleService,
  ProjectService,
  WebSocketService,
} from "@/../bindings/PostPigeon/internal/services"
import { SendRequestData } from "@/../bindings/PostPigeon/internal/services"
import { CollectionRunner } from "@/components/endpoint/CollectionRunner"
import {
  deriveScriptFromOps,
  endpointDefaults,
  fromAuthModel,
  fromBodyFieldModels,
  fromHeaderModels,
  fromOperationModels,
  fromParamModels,
  generateTempId,
  parseStringArray,
  safeParseJSON,
  toAuthModel,
  toBodyFieldModels,
  toHeaderModels,
  toOperationModels,
  toParamModels,
  toTimingData,
} from "@/components/endpoint/endpoint-data"
import { type AuthState, type BodyFieldRow, emptyAuth, type EndpointData, EndpointDetail, type EnvironmentBaseURLOption, type HeaderRow, type OperationRow, type ParamRow, type ResponseData, type TimingData } from "@/components/endpoint/EndpointDetail"
import { EndpointTree, type TreeNode } from "@/components/endpoint/EndpointTree"
import { resolveEnvironmentBaseURLs } from "@/components/endpoint/environment-base-urls"
import { FolderTreeSelector } from "@/components/endpoint/FolderTreeSelector"
import {
  ApifoxImportDialog,
  CurlImportDialog,
  OpenAPIImportDialog,
  PostmanImportDialog,
} from "@/components/endpoint/ImportDialogs"
import { type ImportKind, ImportWizardDialog } from "@/components/endpoint/ImportWizard"
import { restoreCachedWebSocketResponse } from "@/components/endpoint/response-visibility"
import { ScopeSettingsDialog } from "@/components/endpoint/ScopeSettingsDialog"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MethodBadge } from "@/components/ui/method-badge"
import { SplitPane } from "@/components/ui/split-pane"
import { Tabs } from "@/components/ui/tabs"
import { useHotkey } from "@/hooks/useHotkey"
import { t } from "@/hooks/useI18n"
import { useRouteCache } from "@/hooks/useRouteCache"
import { copyText } from "@/lib/clipboard"
import { errorMessage } from "@/lib/errors"
import { type BodyType, type EndpointType, type HTTPMethod, type ParamLocation } from "@/lib/types"
import { cn, downloadTextFile } from "@/lib/utils"
import { baseUrlVersion, currentEnvironmentIds, getCurrentEnvironmentId, getProjectEnvironments, notifyBaseUrlsChanged, projectEnvironments, setCurrentEnvironment, setProjectEnvironmentsList } from "@/stores/app"
import { clearStream } from "@/stores/stream"
import { toastError, toastSuccess, toastWarning } from "@/stores/toast"

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
  type: EndpointType
  method: HTTPMethod
  path: string
  bodyType: BodyType
  bodyContent: string
  contentType: string
  timeout: number
  timeoutMode: string
  /** 跟随重定向：null 表示继承上级，true/false 为显式设置 */
  followRedirects: boolean | null
  sendNoCacheHeaders: boolean | null
  baseUrl: string
  params: ParamRow[]
  headers: HeaderRow[]
  bodyFields: BodyFieldRow[]
  auth: AuthState
  preRequestScript: string
  postResponseScript: string
  docContent: string
  status: string
  tags: string
  description: string
  inheritOperations: boolean
  disabledGlobalParams: string[]
  proxyConfig: string
  tlsConfig: string
  urlEncoding: string
  wsProtocolConversion: string
  inheritedWsProtocolConversion: boolean
  operations: OperationRow[]
  examples: ResponseExample[]
  schemas: ResponseSchema[]
}

export interface ApiManagementProps {
  projectId: string
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
  // WS 连接存活于后端，消息存活于全局 stream store；握手响应也必须按接口保留，
  // 否则切换接口会被另一个接口的 responseData 覆盖，切回来只能恢复正文消息，无法恢复响应 Tabs。
  const webSocketResponseCache = new Map<string, ResponseData>()
  const [expandedIds, setExpandedIds] = cache.createCachedSignal<string[]>("expandedIds", [])
  const [unsavedRequests, setUnsavedRequests] = cache.createCachedSignal<Record<string, UnsavedRequestData>>("unsavedRequests", {})
  // 空的端点数据默认值
  const emptyEndpoint: EndpointData = {
    id: "", name: "", method: "GET" as HTTPMethod, path: "",
    bodyType: "none" as BodyType, bodyContent: "", contentType: "",
    timeout: 30000, followRedirects: null, baseUrl: "",
    params: [], headers: [], bodyFields: [], auth: emptyAuth(),
    preRequestScript: "", postResponseScript: "",
    ...endpointDefaults,
  }
  // 使用 createCachedStore 替代 createStore，自动缓存且保持细粒度响应式
  const [endpointData, setEndpointData] = cache.createCachedStore<EndpointData>("endpointData", { ...emptyEndpoint })
  const [sending, setSending] = createSignal(false)
  // 进行中请求的 ID：后端据此可中途取消；空表示当前没有进行中的请求
  const [activeRequestId, setActiveRequestId] = createSignal("")
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
  // 文件夹转换为模块对话框
  const [convertOpen, setConvertOpen] = createSignal(false)
  const [convertNode, setConvertNode] = createSignal<TreeNode | null>(null)
  const [convertName, setConvertName] = createSignal("")
  const [converting, setConverting] = createSignal(false)
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
  // 导入向导：主组件只持有「哪个框开着、输入是什么」，其余状态由各自的对话框组件自理
  const [openApiOpen, setOpenApiOpen] = createSignal(false)
  const [openApiModuleId, setOpenApiModuleId] = createSignal("")
  const [openApiJson, setOpenApiJson] = createSignal("")
  const [apifoxOpen, setApifoxOpen] = createSignal(false)
  const [apifoxJson, setApifoxJson] = createSignal("")
  const [curlOpen, setCurlOpen] = createSignal(false)
  const [postmanOpen, setPostmanOpen] = createSignal(false)
  const [postmanJson, setPostmanJson] = createSignal("")
  // 当前端点相关的派生数据
  const [environmentBaseUrls, setEnvironmentBaseUrls] = createSignal<EnvironmentBaseURLOption[]>([])
  let savedEndpointLoadToken = 0
  const [globalQueryParams, setGlobalQueryParams] = createSignal<{ name: string; value: string }[]>([])
  const [inheritedOpCounts, setInheritedOpCounts] = createSignal<{ pre: number; post: number }>({ pre: 0, post: 0 })
  // 模块/文件夹设置对话框
  const [scopeSettingsOpen, setScopeSettingsOpen] = createSignal(false)
  const [scopeSettingsNode, setScopeSettingsNode] = createSignal<TreeNode | null>(null)

  // ---- 加载项目树数据 ----
  const loadTree = async () => {
    try {
      const tree = await ProjectService.GetProjectTree(props.projectId)
      setTreeData((tree || []).map(mapModule))
    } catch (e) {
      toastError(e, "error.op.loadFailed")
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

  const loadModuleEnvironmentState = async (moduleId: string) => {
    const urls = await ModuleService.GetModuleBaseURLs(moduleId)
    return resolveEnvironmentBaseURLs(
      getProjectEnvironments(props.projectId),
      urls,
      getCurrentEnvironmentId(props.projectId),
    )
  }

  // ---- 环境、环境列表或 baseUrl 设置变更时，刷新当前端点的环境状态 ----
  // 首次打开端点由 loadSavedEndpointData 使用 detail.moduleId 直接加载，避免依赖
  // activeTabId 早于异步端点详情返回而触发的竞态。
  let environmentRefreshToken = 0
  createEffect(on(
    () => [
      currentEnvironmentIds()[props.projectId],
      baseUrlVersion(),
      projectEnvironments()[props.projectId],
    ] as const,
    async ([envId]) => {
      const refreshToken = ++environmentRefreshToken
      const epId = endpointData.id
      // 仅对已保存的端点生效（树中可找到其所属模块）
      if (!epId || !envId) return
      const moduleId = findModuleIdByNodeId(treeData(), epId)
      if (!moduleId) return
      try {
        const state = await loadModuleEnvironmentState(moduleId)
        // 快速切换环境/端点时，丢弃已经过期的异步结果。
        if (
          refreshToken !== environmentRefreshToken
          || endpointData.id !== epId
          || getCurrentEnvironmentId(props.projectId) !== envId
        ) return
        setEndpointData({ baseUrl: state.currentBaseUrl } as Partial<EndpointData>)
        setEnvironmentBaseUrls(state.options)
      } catch { /* 获取 baseUrl 失败时忽略 */ }
    },
  ))

  // ---- 加载当前端点所属模块的"全局" query 参数（模块自动参数）----
  // 端点切换或树刷新（保存到项目后）时重新加载；未保存请求（不在树中）无模块，清空。
  createEffect(on(
    () => [endpointData.id, treeData()] as const,
    async ([epId]) => {
      if (!epId) { setGlobalQueryParams([]); setInheritedOpCounts({ pre: 0, post: 0 }); return }
      const moduleId = findModuleIdByNodeId(treeData(), epId)
      // 未保存请求不在树中、无继承来源：全局参数与继承操作计数均清零
      if (!moduleId) { setGlobalQueryParams([]); setInheritedOpCounts({ pre: 0, post: 0 }); return }
      try {
        const mps = await ModuleService.GetModuleParams(moduleId)
        setGlobalQueryParams((mps || [])
          .filter(p => p.type === "query" && p.enabled)
          .map(p => ({ name: p.name, value: p.value })))
      } catch { setGlobalQueryParams([]) }
      try {
        const counts = await EndpointService.GetInheritedOperationCounts(epId)
        setInheritedOpCounts({ pre: counts?.pre ?? 0, post: counts?.post ?? 0 })
      } catch { setInheritedOpCounts({ pre: 0, post: 0 }) }
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
      if (!location) { toastWarning(t("module.notSelected")); return }
      const { moduleId, folderId } = resolveSaveLocation(location)
      if (!moduleId) {
        toastWarning(t("module.notSelected"))
        return
      }
      await FolderService.CreateFolder(moduleId, folderId ?? null, name)
      setCreateFolderOpen(false)
      await loadTree()
    } catch (e) {
      toastError(e, "error.op.createFailed")
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
      toastError(e, "error.op.createFailed")
    }
  }

  // ---- 打开"转换为模块"对话框（文件夹节点） ----
  const openConvertToModule = (node: TreeNode) => {
    if (node.type !== "folder") return
    setConvertNode(node)
    setConvertName(node.name) // 默认填充文件夹名称
    setConvertOpen(true)
  }

  const handleConvertToModule = async () => {
    const node = convertNode()
    const name = convertName().trim()
    if (!node || !name) return
    setConverting(true)
    try {
      const created = await ModuleService.ConvertFolderToModule(node.id, name)
      setConvertOpen(false)
      setConvertNode(null)
      // 该文件夹下的接口已换所属模块：关闭其已打开的标签页，避免陈旧的 moduleId
      const subtree = collectSubtreeIds(node)
      requestTabs().filter(t => subtree.has(t.id)).forEach(t => closeTab(t.id))
      await loadTree()
      // 新模块默认展开，便于用户立即看到转换结果
      if (created) setExpandedIds([...new Set([...expandedIds(), created.id])])
    } catch (e) {
      toastError(e, "error.op.convertFailed")
    } finally {
      setConverting(false)
    }
  }

  // ---- 树映射函数 ----
  const mapModule = (m: ModuleTree): TreeNode => ({
    id: m.id, type: "module", name: m.name,
    endpointDisplay: (m.endpointDisplay === "url" ? "url" : "name"),
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

  const mapEndpoint = (e: Endpoint): TreeNode => ({
    id: e.id, type: "endpoint", name: e.name, method: e.method as HTTPMethod,
    endpointType: (e.type as EndpointType) || "http", path: e.path,
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
  const createUnsavedTab = (parentNodeId?: string, override?: Partial<UnsavedRequestData>) => {
    // 使仍在进行中的已保存端点加载失效，避免其结果覆盖新建请求。
    savedEndpointLoadToken++
    // 记住默认保存位置：优先点击的节点，否则回退到第一个模块
    if (parentNodeId && findNodeInTree(treeData(), parentNodeId)) {
      setSelectedSaveLocation(parentNodeId)
      ensureAncestorsExpanded(parentNodeId)
    }
    const tempId = generateTempId()
    // 展开顺序：默认值 → 调用方覆盖（cURL 导入等）；id 始终由本函数决定
    const unsaved: UnsavedRequestData = {
      name: t("endpoint.newRequest"), method: "GET" as HTTPMethod,
      path: "/", bodyType: "none" as BodyType, bodyContent: "", contentType: "",
      timeout: 30000, followRedirects: null, baseUrl: "",
      params: [], headers: [], bodyFields: [], auth: emptyAuth(),
      preRequestScript: "", postResponseScript: "",
      ...endpointDefaults,
      ...override,
      id: tempId,
    }
    setUnsavedRequests(prev => ({ ...prev, [tempId]: unsaved }))
    setRequestTabs(prev => [...prev, { id: tempId, name: unsaved.name, method: unsaved.method, saved: false, dirty: false }])
    setActiveTabId(tempId)
    setEndpointData({ ...unsaved } as EndpointData)
    setEnvironmentBaseUrls([])
    setResponseData(null)
  }


  // ---- cURL 导入 ----
  const handleImportCurl = () => setCurlOpen(true)

  /** cURL 解析结果 → 一个未保存的请求标签页 */
  const createTabFromCurl = (parsed: CurlRequest) => {
    createUnsavedTab(undefined, {
      name: parsed.url || t("endpoint.newRequest"),
      method: (parsed.method || "GET") as HTTPMethod,
      // cURL 里是完整地址，直接作为路径（后端识别到协议头会忽略前置 URL）
      path: parsed.url,
      bodyType: (parsed.bodyType || "none") as BodyType,
      bodyContent: parsed.bodyContent || "",
      contentType: parsed.contentType || "",
      followRedirects: parsed.followRedirects,
      timeout: parsed.timeoutMs > 0 ? parsed.timeoutMs : 30000,
      timeoutMode: parsed.timeoutMs > 0 ? "value" : "inherit",
      params: (parsed.params || []).map(p => ({
        id: crypto.randomUUID(), type: (p.type || "query") as ParamLocation,
        name: p.name, value: p.value, description: "", enabled: p.enabled,
        dataType: "string", required: false, example: "",
      })),
      headers: (parsed.headers || []).map(h => ({
        id: crypto.randomUUID(), name: h.name, value: h.value,
        description: "", enabled: h.enabled, required: false, example: "",
      })),
      bodyFields: (parsed.bodyFields || []).map(f => ({
        id: crypto.randomUUID(), name: f.name, value: f.value,
        fieldType: (f.fieldType === "file" ? "file" : "text") as "text" | "file", enabled: f.enabled,
      })),
      auth: fromAuthModel(parsed.auth),
      // curl -k 对应接口级「跳过证书校验」
      tlsConfig: parsed.insecure ? JSON.stringify({ mode: "insecure" }) : "",
    })
  }

  // ---- 「导入接口」向导：选格式与来源，拿到文档后转交对应的预览对话框 ----
  const [wizardOpen, setWizardOpen] = createSignal(false)
  /** 从模块菜单进入时锁定为 OpenAPI；项目级入口不锁 */
  const [wizardKind, setWizardKind] = createSignal<ImportKind | undefined>()

  const handleWizardLoaded = (kind: ImportKind, text: string) => {
    setWizardOpen(false)
    if (kind === "postman") {
      setPostmanJson(text)
      setPostmanOpen(true)
    } else if (kind === "apifox") {
      setApifoxJson(text)
      setApifoxOpen(true)
    } else {
      setOpenApiJson(text)
      setOpenApiOpen(true)
    }
  }

  /** 供 OpenAPI 导入选择「并入哪个模块」 */
  const moduleChoices = () => treeData()
    .filter(node => node.type === "module")
    .map(node => ({ id: node.id, name: node.name }))

  /** 项目级导入：格式与目标模块都在弹窗里选 */
  const handleImportAPIs = () => {
    setOpenApiModuleId("")
    setWizardKind(undefined)
    setWizardOpen(true)
  }

  /** 导入完成后的统一收尾：模块名/环境/前置 URL 都可能变化 */
  const refreshAfterImport = async () => {
    await loadTree()
    try {
      const envs = await EnvironmentService.ListEnvironments(props.projectId)
      setProjectEnvironmentsList(props.projectId, envs || [])
    } catch { /* 刷新环境列表失败时忽略，树已刷新 */ }
    notifyBaseUrlsChanged()
  }

  // ---- 集合运行器 ----
  const [runnerOpen, setRunnerOpen] = createSignal(false)
  const [runnerScope, setRunnerScope] = createSignal<{ moduleId?: string; folderId?: string; name: string }>({ name: "" })

  const handleRunCollection = (node: TreeNode) => {
    setRunnerScope(node.type === "module"
      ? { moduleId: node.id, name: node.name }
      : { folderId: node.id, name: node.name })
    setRunnerOpen(true)
  }

  // ---- 导出模块为 OpenAPI ----
  const handleExportOpenAPI = async (node: TreeNode) => {
    try {
      const json = await ImportExportService.ExportOpenAPI(node.id)
      downloadTextFile(`${node.name || "module"}.openapi.json`, json, "application/json")
      toastSuccess(t("importexport.exported"))
    } catch (e) {
      toastError(e, "error.op.exportFailed")
    }
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
    const currentResponse = responseData()
    if (endpointData.type === "websocket" && endpointData.id && currentResponse) {
      webSocketResponseCache.set(endpointData.id, currentResponse)
    }
    const loadToken = ++savedEndpointLoadToken
    try {
      const detail = await EndpointService.GetEndpoint(endpointId)
      if (detail) {
        // detail.moduleId 是首次加载时唯一可靠的模块来源：在提交端点数据前一次性
        // 构建当前 Base URL 与完整环境选项，避免依赖 activeTabId 的异步时序。
        let environmentState = resolveEnvironmentBaseURLs(
          getProjectEnvironments(props.projectId),
          [],
          getCurrentEnvironmentId(props.projectId),
        )
        if (detail.moduleId) {
          try {
            environmentState = await loadModuleEnvironmentState(detail.moduleId)
          } catch { /* 获取 baseUrl 失败时不阻塞加载 */ }
        }
        // 用户可能在请求期间又打开了另一个端点，只允许最后一次加载提交状态。
        if (loadToken !== savedEndpointLoadToken) return
        setEnvironmentBaseUrls(environmentState.options)
        setEndpointData({
          id: detail.id, name: detail.name, type: (detail.type as EndpointType) || "http",
          method: detail.method as HTTPMethod,
          path: detail.path, bodyType: detail.bodyType as BodyType, bodyContent: detail.bodyContent,
          contentType: detail.contentType, timeout: detail.timeout, timeoutMode: detail.timeoutMode || "inherit",
          followRedirects: detail.followRedirects, sendNoCacheHeaders: detail.sendNoCacheHeaders,
          baseUrl: environmentState.currentBaseUrl,
          params: fromParamModels(detail.params),
          headers: fromHeaderModels(detail.headers),
          bodyFields: fromBodyFieldModels(detail.bodyFields),
          auth: fromAuthModel(detail.auth),
          preRequestScript: detail.preRequestScript || "",
          postResponseScript: detail.postResponseScript || "",
          docContent: detail.docContent || "",
          status: detail.status || "", tags: detail.tags || "", description: detail.description || "",
          inheritOperations: detail.inheritOperations ?? true,
          disabledGlobalParams: parseStringArray(detail.disabledGlobalParams),
          proxyConfig: detail.proxyConfig || "",
          tlsConfig: detail.tlsConfig || "",
          urlEncoding: detail.urlEncoding || "",
          wsProtocolConversion: detail.wsProtocolConversion || "",
          inheritedWsProtocolConversion: detail.inheritedWsProtocolConversion ?? true,
          operations: fromOperationModels(detail.operations),
          examples: detail.examples || [], schemas: detail.schemas || [],
        } as EndpointData)
        let loadedResponse: ResponseData | null = null
        if (detail.response) {
          // 持久化响应的 headers/cookies/actualRequest/timing 均为 JSON 字符串，需解析后再用
          loadedResponse = {
            statusCode: detail.response.statusCode,
            timing: toTimingData(safeParseJSON<Partial<TimingData>>(detail.response.timing, {})),
            size: detail.response.size, body: detail.response.body,
            headers: safeParseJSON<Record<string, string[]>>(detail.response.headers, {}),
            cookies: safeParseJSON<CookieInfo[]>(detail.response.cookies, []),
            contentType: detail.response.contentType,
            actualRequest: safeParseJSON<ActualRequestInfo | null>(detail.response.actualRequest, null),
          }
        }
        setResponseData(restoreCachedWebSocketResponse(
          endpointId,
          detail.type === "websocket",
          loadedResponse,
          webSocketResponseCache,
        ))
      }
    } catch (e) {
      if (loadToken === savedEndpointLoadToken) toastError(e, "error.op.loadFailed")
    }
  }

  // ---- 切换标签页 ----
  const handleTabChange = async (tabId: string) => {
    const currentResponse = responseData()
    if (endpointData.type === "websocket" && endpointData.id && currentResponse) {
      webSocketResponseCache.set(endpointData.id, currentResponse)
    }
    setActiveTabId(tabId)
    const tab = requestTabs().find(t => t.id === tabId)
    if (!tab) return
    if (tab.saved) await loadSavedEndpointData(tabId)
    else {
      savedEndpointLoadToken++
      setEnvironmentBaseUrls([])
      const unsaved = unsavedRequests()[tabId]
      if (unsaved) setEndpointData({
        id: unsaved.id, name: unsaved.name, type: unsaved.type ?? "http", method: unsaved.method, path: unsaved.path,
        bodyType: unsaved.bodyType, bodyContent: unsaved.bodyContent, contentType: unsaved.contentType,
        timeout: unsaved.timeout, timeoutMode: unsaved.timeoutMode || "inherit",
        followRedirects: unsaved.followRedirects, sendNoCacheHeaders: unsaved.sendNoCacheHeaders, baseUrl: unsaved.baseUrl,
        params: unsaved.params ?? [], headers: unsaved.headers ?? [],
        bodyFields: unsaved.bodyFields ?? [], auth: unsaved.auth ?? emptyAuth(),
        preRequestScript: unsaved.preRequestScript ?? "", postResponseScript: unsaved.postResponseScript ?? "",
        docContent: unsaved.docContent ?? "", status: unsaved.status ?? "", tags: unsaved.tags ?? "",
        description: unsaved.description ?? "", inheritOperations: unsaved.inheritOperations ?? true,
        disabledGlobalParams: unsaved.disabledGlobalParams ?? [],
        proxyConfig: unsaved.proxyConfig ?? "",
        tlsConfig: unsaved.tlsConfig ?? "",
        urlEncoding: unsaved.urlEncoding ?? "",
        wsProtocolConversion: unsaved.wsProtocolConversion ?? "",
        inheritedWsProtocolConversion: unsaved.inheritedWsProtocolConversion ?? true,
        operations: unsaved.operations ?? [], examples: unsaved.examples ?? [], schemas: unsaved.schemas ?? [],
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
    } else if (!ct.dirty) {
      // 仅在首次变脏时更新，避免每次按键都重建 requestTabs 数组（进而重建 Tab 触发器）
      setRequestTabs(pt => pt.map(t => t.id === ct.id ? { ...t, dirty: true } : t))
    }
  }

  // ---- 发送请求 ----

  /**
   * 把当前编辑态组装成后端所需的请求数据。
   * 发送与「复制为 cURL」共用同一份组装逻辑，避免两处逐渐走偏。
   */
  const buildSendRequestData = (ep: EndpointData, requestId = "") => {
    const sendData = new SendRequestData()
    sendData.requestId = requestId
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
    sendData.timeout = ep.timeout; sendData.timeoutMode = ep.timeoutMode
    sendData.followRedirects = ep.followRedirects; sendData.sendNoCacheHeaders = ep.sendNoCacheHeaders
    sendData.proxyConfig = ep.proxyConfig
    sendData.tlsConfig = ep.tlsConfig
    sendData.urlEncoding = ep.urlEncoding
    sendData.disabledGlobalParams = JSON.stringify(ep.disabledGlobalParams || [])
    sendData.operations = toOperationModels(ep.operations)
    sendData.inheritOperations = ep.inheritOperations
    // 已保存端点由后端根据操作组合脚本；未保存请求在此把 script 类型操作拼接为前置/后置脚本
    sendData.preRequestScript = deriveScriptFromOps(ep.operations, "pre", ep.preRequestScript)
    sendData.postResponseScript = deriveScriptFromOps(ep.operations, "post", ep.postResponseScript)
    return sendData
  }

  const handleSend = async () => {
    const ep = endpointData
    if (!ep.id) return
    setSending(true)
    // 每次发送生成唯一 ID，后端据此登记进行中的请求，用户可随时取消
    const requestId = crypto.randomUUID()
    setActiveRequestId(requestId)
    try {
      const sendData = buildSendRequestData(ep, requestId)

      // 流 ID 由后端生成且全局唯一，发送前清掉上一条流的缓冲，避免 store 无限增长
      const previousStreamId = responseData()?.streamId
      if (previousStreamId) clearStream(previousStreamId)
      const resp = await HTTPService.SendRequest(sendData)
      if (resp) {
        if (resp.streaming) {
          // SSE / NDJSON / JSON Sequence 以实时记录流展示（事件通过 http:stream 持续推送）。
          setResponseData({
            statusCode: resp.statusCode,
            timing: toTimingData(resp.timing),
            size: 0, body: "", headers: resp.headers,
            cookies: [], contentType: resp.contentType, actualRequest: resp.actualRequest,
            streaming: true, streamId: resp.streamId, streamFormat: resp.streamFormat,
            scripts: resp.scripts || undefined,
          })
        } else {
          setResponseData({
            statusCode: resp.statusCode,
            timing: toTimingData(resp.timing),
            size: resp.size, body: resp.body, rawBody: resp.rawBody, headers: resp.headers,
            cookies: resp.cookies || [], contentType: resp.contentType,
            actualRequest: resp.actualRequest,
            scripts: resp.scripts || undefined,
            truncated: resp.truncated, truncatedLimit: resp.truncatedLimit,
            rawBodyOmitted: resp.rawBodyOmitted, skipped: resp.skipped,
          })
        }
      }
    } catch (e) {
      // 请求失败（如协议错误、连接失败、超时等）：将错误信息展示到响应框，而非仅打印到控制台
      toastError(e, "error.op.sendFailed")
      const message = errorMessage(e, "error.op.sendFailed")
      setResponseData({
        statusCode: 0,
        timing: toTimingData(null),
        size: 0, body: "", headers: {}, cookies: [], contentType: "",
        actualRequest: null,
        error: message,
      })
    } finally { setSending(false); setActiveRequestId("") }
  }

  /** WebSocket 握手与普通请求共用完整编辑态，后端统一解析变量、继承参数、认证与前置操作。 */
  const handleWSConnect = async (autoConvertProtocol: boolean) => {
    const ep = endpointData
    const endpointId = ep.id
    const resp = await WebSocketService.Connect(endpointId, buildSendRequestData(ep), autoConvertProtocol)
    if (resp) {
      // WebSocket 的 101 Upgrade（以及 4xx/5xx 握手拒绝）仍是一条标准 HTTP 响应。
      // 正文页签由消息流接管，其余响应页签继续复用普通请求的数据模型。
      const handshakeResponse: ResponseData = {
        statusCode: resp.statusCode,
        timing: toTimingData(resp.timing),
        size: resp.size,
        body: resp.body || "",
        rawBody: resp.rawBody,
        headers: resp.headers,
        cookies: resp.cookies || [],
        contentType: resp.contentType,
        actualRequest: resp.actualRequest,
        scripts: resp.scripts || undefined,
        truncated: resp.truncated,
        truncatedLimit: resp.truncatedLimit,
        rawBodyOmitted: resp.rawBodyOmitted,
        skipped: resp.skipped,
      }
      webSocketResponseCache.set(endpointId, handshakeResponse)
      // 连接期间用户可能已经切到其它接口，不能用迟到的握手结果覆盖当前响应。
      if (endpointData.id === endpointId) setResponseData(handshakeResponse)
    }
  }

  const handleWSDisconnect = async () => {
    await WebSocketService.Close(endpointData.id)
  }

  /** 把当前请求复制为 cURL 命令 */
  const handleCopyAsCurl = async () => {
    const ep = endpointData
    try {
      const command = await CurlService.ToCurl(buildSendRequestData(ep))
      await copyText(command)
      toastSuccess(t("curl.copied"))
    } catch (e) {
      toastError(e, "error.op.copyFailed")
    }
  }

  /** 取消进行中的请求 */
  const handleCancelSend = async () => {
    const id = activeRequestId()
    if (!id) return
    try {
      await HTTPService.CancelRequest(id)
    } catch (e) {
      toastError(e)
    }
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
        timeout: ep.timeout, timeoutMode: ep.timeoutMode, followRedirects: ep.followRedirects,
        sendNoCacheHeaders: ep.sendNoCacheHeaders,
        preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
        type: ep.type, docContent: ep.docContent, status: ep.status, tags: ep.tags,
        description: ep.description, inheritOperations: ep.inheritOperations,
        disabledGlobalParams: JSON.stringify(ep.disabledGlobalParams || []),
        proxyConfig: ep.proxyConfig,
        tlsConfig: ep.tlsConfig,
        urlEncoding: ep.urlEncoding,
        wsProtocolConversion: ep.wsProtocolConversion,
        params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
        headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
        operations: toOperationModels(ep.operations),
        examples: (ep.examples as ResponseExample[]) || [], schemas: (ep.schemas as ResponseSchema[]) || [],
      })
      setRequestTabs(pt => pt.map(t => t.id === ep.id ? { ...t, dirty: false } : t))
      await loadTree()
    } catch (e) { toastError(e, "error.op.saveFailed") }
  }

  const handleSaveToProject = async () => {
    const ep = endpointData; const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct || ct.saved) return
    const name = saveName().trim()
    if (!name) return
    setSaving(true)
    try {
      const { moduleId, folderId } = resolveSaveLocation(selectedSaveLocation())
      if (!moduleId) { toastWarning(t("module.notSelected")); return }
      const created = await EndpointService.CreateFullEndpoint(moduleId, folderId ?? null, {
        id: "", name, method: ep.method, path: ep.path,
        bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
        timeout: ep.timeout, timeoutMode: ep.timeoutMode, followRedirects: ep.followRedirects,
        sendNoCacheHeaders: ep.sendNoCacheHeaders,
        preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
        type: ep.type, docContent: ep.docContent, status: ep.status, tags: ep.tags,
        description: ep.description, inheritOperations: ep.inheritOperations,
        disabledGlobalParams: JSON.stringify(ep.disabledGlobalParams || []),
        proxyConfig: ep.proxyConfig,
        tlsConfig: ep.tlsConfig,
        urlEncoding: ep.urlEncoding,
        wsProtocolConversion: ep.wsProtocolConversion,
        params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
        headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
        operations: toOperationModels(ep.operations), examples: [] as ResponseExample[], schemas: [] as ResponseSchema[],
      })
      // 新建端点后，把前置/后置操作补存（CreateFullEndpoint 不含操作）
      if (created && ep.operations.length > 0) {
        await EndpointService.SaveEndpointData({
          id: created.id, name, method: ep.method, path: ep.path,
          bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
          timeout: ep.timeout, timeoutMode: ep.timeoutMode, followRedirects: ep.followRedirects,
          sendNoCacheHeaders: ep.sendNoCacheHeaders,
          preRequestScript: ep.preRequestScript, postResponseScript: ep.postResponseScript,
          type: ep.type, docContent: ep.docContent, status: ep.status, tags: ep.tags,
          description: ep.description, inheritOperations: ep.inheritOperations,
          disabledGlobalParams: JSON.stringify(ep.disabledGlobalParams || []),
          proxyConfig: ep.proxyConfig,
          tlsConfig: ep.tlsConfig,
          urlEncoding: ep.urlEncoding,
          wsProtocolConversion: ep.wsProtocolConversion,
          params: toParamModels(ep.params), bodyFields: toBodyFieldModels(ep.bodyFields),
          headers: toHeaderModels(ep.headers), auth: toAuthModel(ep.auth),
          operations: toOperationModels(ep.operations), examples: [] as ResponseExample[], schemas: [] as ResponseSchema[],
        })
      }
      if (created) {
        setRequestTabs(pt => pt.map(t => t.id === ct.id ? { id: created.id, name, method: ep.method as HTTPMethod, saved: true, dirty: false } : t))
        setEndpointData({ id: created.id, name } as EndpointData)
        setUnsavedRequests(p => { const n = { ...p }; delete n[ct.id]; return n })
        setActiveTabId(created.id)
        setSaveDialogOpen(false)
        await loadTree()
        // 重新读取一次，拿到新归属位置对应的五级继承结果（尤其是 WS 协议自动转换）。
        await loadSavedEndpointData(created.id)
      }
    } catch (e) { toastError(e, "error.op.saveFailed") } finally { setSaving(false) }
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
      } else {
        savedEndpointLoadToken++
        setActiveTabId(null)
        setEndpointData({ ...emptyEndpoint })
        setEnvironmentBaseUrls([])
        setResponseData(null)
      }
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
    try { await EndpointService.DeleteEndpoint(id); closeTab(id); setDeleteConfirmOpen(false); setDeletingEndpointId(null); await loadTree() } catch (e) { toastError(e, "error.op.deleteFailed") } finally { setDeleting(false) }
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
    } catch (e) { toastError(e, "error.op.renameFailed") } finally { setRenaming(false) }
  }

  // ---- 树节点操作：复制（模块 / 文件夹 / 端点） ----
  const handleTreeCopy = async (node: TreeNode) => {
    try {
      if (node.type === "module") await ModuleService.DuplicateModule(node.id)
      else if (node.type === "folder") await FolderService.DuplicateFolder(node.id)
      else await EndpointService.DuplicateEndpoint(node.id)
      await loadTree()
    } catch (e) { toastError(e, "error.op.copyFailed") }
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
    } catch (e) { toastError(e, "error.op.deleteFailed") } finally { setTreeDeleting(false) }
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
    } catch (e) { toastError(e, "error.op.moveFailed") } finally { setMoving(false) }
  }

  /** 移动目标选择器中禁止选中的节点（被移动节点自身及其后代） */
  const moveDisabledIds = () => {
    const n = moveNode()
    return n ? collectSubtreeIds(n) : new Set<string>()
  }

  // ---- 模块菜单的「导入接口文档」：格式锁定为 OpenAPI，目标模块锁定为该模块 ----
  const handleImportOpenAPI = (node: TreeNode) => {
    if (node.type !== "module") return
    setOpenApiModuleId(node.id)
    setWizardKind("openapi")
    setWizardOpen(true)
  }

  // ---- 新建文档（doc 类型端点，作为叶子与接口同级） ----
  const handleCreateDocument = async (parentNodeId: string | undefined, _type?: "module" | "folder") => {
    const location = parentNodeId && findNodeInTree(treeData(), parentNodeId) ? parentNodeId : getEffectiveSaveLocation()
    if (!location) { toastWarning(t("module.notSelected")); return }
    const { moduleId, folderId } = resolveSaveLocation(location)
    if (!moduleId) return
    try {
      const doc = await EndpointService.CreateDocument(moduleId, folderId ?? null, t("doc.untitled"))
      await loadTree()
      if (doc) {
        setRequestTabs(prev => [...prev, { id: doc.id, name: doc.name, method: "GET" as HTTPMethod, saved: true, dirty: false }])
        setActiveTabId(doc.id)
        await loadSavedEndpointData(doc.id)
      }
    } catch (e) { toastError(e, "error.op.createFailed") }
  }

  // ---- 新建 WebSocket 端点（直接创建并打开） ----
  const handleCreateTyped = async (parentNodeId: string | undefined, _type: "module" | "folder" | undefined, endpointType: "websocket") => {
    const location = parentNodeId && findNodeInTree(treeData(), parentNodeId) ? parentNodeId : getEffectiveSaveLocation()
    if (!location) { toastWarning(t("module.notSelected")); return }
    const { moduleId, folderId } = resolveSaveLocation(location)
    if (!moduleId) return
    const name = t("endpoint.newWebSocket")
    try {
      const ep = await EndpointService.CreateTypedEndpoint(moduleId, folderId ?? null, name, "GET", "", endpointType)
      await loadTree()
      if (ep) {
        setRequestTabs(prev => [...prev, { id: ep.id, name: ep.name, method: "GET" as HTTPMethod, saved: true, dirty: false }])
        setActiveTabId(ep.id)
        await loadSavedEndpointData(ep.id)
      }
    } catch (e) { toastError(e, "error.op.createFailed") }
  }

  // ---- 设置模块下接口显示方式（名称 / URL） ----
  const handleSetEndpointDisplay = async (moduleId: string, mode: "name" | "url") => {
    try {
      await ModuleService.SetEndpointDisplay(moduleId, mode)
      await loadTree()
    } catch (e) { toastError(e, "error.op.saveFailed") }
  }

  // ---- 端点拖拽排序 ----
  const handleReorderEndpoints = async (orderedIds: string[]) => {
    try {
      await EndpointService.ReorderEndpoints(orderedIds)
      await loadTree()
    } catch (e) { toastError(e, "error.op.reorderFailed") }
  }

  // ---- 打开模块/文件夹设置 ----
  const openScopeSettings = (node: TreeNode) => {
    if (node.type !== "module" && node.type !== "folder") return
    setScopeSettingsNode(node)
    setScopeSettingsOpen(true)
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
            onCreateTyped={handleCreateTyped}
            onRename={handleTreeRename} onCopy={handleTreeCopy}
            onDelete={handleTreeDelete} onMove={handleTreeMove}
            onImportOpenAPI={handleImportOpenAPI}
            onImportAPIs={handleImportAPIs}
            onImportCurl={handleImportCurl}
            onExportOpenAPI={handleExportOpenAPI}
            onRunCollection={handleRunCollection}
            onCreateDocument={handleCreateDocument}
            onOpenSettings={openScopeSettings}
            onSetEndpointDisplay={handleSetEndpointDisplay}
            onConvertToModule={openConvertToModule}
            onReorderEndpoints={handleReorderEndpoints}
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
                // 有未保存改动（新建未保存 或 已保存但有改动）：方法与标题整体斜体，不显示任何圆点
                label: (
                  <span class={cn("inline-flex items-center gap-1", (!tab.saved || tab.dirty) && "italic")}>
                    <MethodBadge method={tab.method} />
                    <span>{tab.name}</span>
                  </span>
                ),
                closable: true,
              }))}
              value={activeTabId() || ""} onChange={handleTabChange} onClose={handleCloseTab}
            >
              {() => endpointData.id ? <EndpointDetail
                endpoint={endpointData} response={responseData()} sending={sending()}
                isUnsaved={isActiveTabUnsaved()} onSend={handleSend} onCancelSend={handleCancelSend}
                onWSConnect={handleWSConnect} onWSDisconnect={handleWSDisconnect}
                onCopyAsCurl={handleCopyAsCurl} onSave={handleSave}
                onDelete={handleDelete} onChange={handleDataChange}
                currentEnvironmentId={getCurrentEnvironmentId(props.projectId)}
                environmentBaseUrls={environmentBaseUrls()}
                onEnvironmentChange={handleEnvironmentChange}
                projectId={props.projectId}
                globalQueryParams={globalQueryParams()}
                inheritedOpCounts={inheritedOpCounts()}
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

      {/* 导入向导（各自持有预览与勾选状态） */}
      <ImportWizardDialog
        open={wizardOpen()} onClose={() => setWizardOpen(false)}
        fixedKind={wizardKind()}
        onLoaded={handleWizardLoaded}
      />
      <OpenAPIImportDialog
        open={openApiOpen()} onClose={() => setOpenApiOpen(false)}
        projectId={props.projectId}
        moduleId={openApiModuleId() || undefined}
        modules={moduleChoices()}
        json={openApiJson()}
        onImported={refreshAfterImport}
      />
      <ApifoxImportDialog
        open={apifoxOpen()} onClose={() => setApifoxOpen(false)}
        projectId={props.projectId} json={apifoxJson()}
        onImported={refreshAfterImport}
      />
      <CurlImportDialog
        open={curlOpen()} onClose={() => setCurlOpen(false)}
        onParsed={createTabFromCurl}
      />
      <PostmanImportDialog
        open={postmanOpen()} onClose={() => setPostmanOpen(false)}
        projectId={props.projectId} json={postmanJson()}
        onImported={refreshAfterImport}
      />

      <CollectionRunner
        open={runnerOpen()}
        onClose={() => setRunnerOpen(false)}
        moduleId={runnerScope().moduleId}
        folderId={runnerScope().folderId}
        scopeName={runnerScope().name}
        environmentId={getCurrentEnvironmentId(props.projectId)}
      />

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

      {/* 文件夹转换为模块对话框 */}
      <Dialog open={convertOpen()} onClose={() => setConvertOpen(false)} title={t("folder.convertToModule")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <p class="text-sm text-muted-foreground">{t("folder.convertToModuleHint")}</p>
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("module.name")}</label>
            <Input
              value={convertName()}
              onInput={(e) => setConvertName(e.currentTarget.value)}
              placeholder={t("module.name")}
              onKeyDown={(e) => e.key === "Enter" && handleConvertToModule()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConvertOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleConvertToModule} disabled={!convertName().trim() || converting()}>
              {converting() ? t("common.saving") : t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 模块/文件夹设置对话框 */}
      <Show when={scopeSettingsNode()}>
        {(node) => (
          <ScopeSettingsDialog
            open={scopeSettingsOpen()}
            onClose={() => setScopeSettingsOpen(false)}
            scopeType={node().type as "module" | "folder"}
            scopeId={node().id}
            scopeName={node().name}
            projectId={props.projectId}
          />
        )}
      </Show>
    </>
  )
}
