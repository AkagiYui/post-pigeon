// 接口管理主界面组件
// 左侧树形面板 + 右侧多 Tab 端点详情编辑器
// 支持未保存的请求标签页和已保存的端点标签页
import { createSignal, For, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"

import type {
  EndpointDetail as EndpointDetailType,
  FolderTree,
  HTTPResponseData,
  ModuleTree,
} from "@/../bindings/post-pigeon/internal/services"
import {
  EndpointService,
  FolderService,
  HTTPService,
  ModuleService,
  ProjectService,
} from "@/../bindings/post-pigeon/internal/services"
import { SendRequestData } from "@/../bindings/post-pigeon/internal/services"
import { type EndpointData, EndpointDetail, type ResponseData } from "@/components/endpoint/EndpointDetail"
import { EndpointTree, type TreeNode } from "@/components/endpoint/EndpointTree"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SplitPane } from "@/components/ui/split-pane"
import { Tabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"
import { type BodyType, type HTTPMethod } from "@/lib/types"
import { getCurrentEnvironmentId } from "@/stores/app"

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
}

let tempIdCounter = 0
function generateTempId(): string {
  tempIdCounter++
  return `__unsaved_${tempIdCounter}_${Date.now()}`
}

export interface ApiManagementProps {
  projectId: string
  modules: any[]
}

/**
 * ApiManagement 接口管理主界面
 */
export function ApiManagement(props: ApiManagementProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false)
  const [treeData, setTreeData] = createSignal<TreeNode[]>([])
  const [requestTabs, setRequestTabs] = createSignal<RequestTab[]>([])
  const [activeTabId, setActiveTabId] = createSignal<string | null>(null)
  // 空的端点数据默认值
  const emptyEndpoint: EndpointData = {
    id: "", name: "", method: "GET" as HTTPMethod, path: "",
    bodyType: "none" as BodyType, bodyContent: "", contentType: "",
    timeout: 30000, followRedirects: true, baseUrl: "",
  }
  // 使用 createStore 替代 createSignal，实现细粒度响应式更新
  // 避免每次输入都创建新对象引用导致 EndpointDetail 组件被重新挂载（丢失焦点）
  const [endpointData, setEndpointData] = createStore<EndpointData>({ ...emptyEndpoint })
  const [responseData, setResponseData] = createSignal<ResponseData | null>(null)
  const [sending, setSending] = createSignal(false)
  const [unsavedRequests, setUnsavedRequests] = createSignal<Record<string, UnsavedRequestData>>({})
  const [saveDialogOpen, setSaveDialogOpen] = createSignal(false)
  const [saveName, setSaveName] = createSignal("")
  const [selectedSaveLocation, setSelectedSaveLocation] = createSignal("")
  const [saving, setSaving] = createSignal(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = createSignal(false)
  const [pendingCloseTabId, setPendingCloseTabId] = createSignal<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false)
  const [deletingEndpointId, setDeletingEndpointId] = createSignal<string | null>(null)
  const [deleting, setDeleting] = createSignal(false)
  const [createFolderOpen, setCreateFolderOpen] = createSignal(false)
  const [newFolderName, setNewFolderName] = createSignal("")
  const [createFolderParentId, setCreateFolderParentId] = createSignal<string | undefined>()
  const [createFolderParentType, setCreateFolderParentType] = createSignal<"module" | "folder">("module")
  const [createModuleOpen, setCreateModuleOpen] = createSignal(false)
  const [newModuleName, setNewModuleName] = createSignal("")

  // ---- 打开创建文件夹对话框 ----
  const openCreateFolder = (parentId: string | undefined, type: "module" | "folder") => {
    setCreateFolderParentId(parentId)
    setCreateFolderParentType(type)
    setNewFolderName("")
    setCreateFolderOpen(true)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName().trim()
    if (!name) return

    try {
      const parentId = createFolderParentId()
      const parentType = createFolderParentType()
      const moduleId = findModuleId(treeData(), parentId, parentType)
      if (!moduleId) {
        console.error("无法确定所属模块 ID")
        return
      }
      await FolderService.CreateFolder(moduleId, parentType === "folder" ? parentId ?? null : null, name)
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

  // ---- 加载项目树数据 ----
  const loadTree = async () => {
    try {
      const tree = await ProjectService.GetProjectTree(props.projectId)
      setTreeData((tree || []).map(mapModule))
    } catch (e) {
      console.error("加载项目树失败", e)
    }
  }

  onMount(loadTree)

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

  // 从树数据中递归查找节点所属的模块 ID
  const findModuleId = (nodes: TreeNode[], nodeId: string | undefined, nodeType: "module" | "folder"): string | undefined => {
    for (const node of nodes) {
      if (nodeType === "module" && node.id === nodeId) return node.id
      if (node.children) {
        if (nodeType === "folder") {
          const found = node.children.find(c => c.id === nodeId && c.type === "folder")
          if (found && node.type === "module") return node.id
        }
        const result = findModuleId(node.children, nodeId, nodeType)
        if (result) return result
      }
    }
    return undefined
  }

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

  // ---- 构建保存位置选项 ----
  const buildSaveLocationOptions = (nodes: TreeNode[], level = 0): { value: string; label: string }[] => {
    const result: { value: string; label: string }[] = []
    for (const node of nodes) {
      if (node.type === "module" || node.type === "folder") {
        const indent = "  ".repeat(level)
        const prefix = node.type === "module" ? "📦 " : "  📁 "
        result.push({ value: `${node.type}:${node.id}`, label: `${indent}${prefix}${node.name}` })
        if (node.children) result.push(...buildSaveLocationOptions(node.children, level + 1))
      }
    }
    return result
  }

  const resolveSaveLocation = (locationValue: string): { moduleId: string; folderId: string | undefined } => {
    const [type, id] = locationValue.split(":")
    if (type === "module") return { moduleId: id, folderId: undefined }
    const moduleId = findModuleIdByNodeId(treeData(), id)
    return { moduleId: moduleId || "", folderId: id }
  }

  // ---- 创建未保存请求 ----
  const createUnsavedTab = () => {
    const tempId = generateTempId()
    const unsaved: UnsavedRequestData = {
      id: tempId, name: t("endpoint.newRequest"), method: "GET" as HTTPMethod,
      path: "/", bodyType: "none" as BodyType, bodyContent: "", contentType: "",
      timeout: 30000, followRedirects: true, baseUrl: "",
    }
    setUnsavedRequests(prev => ({ ...prev, [tempId]: unsaved }))
    setRequestTabs(prev => [...prev, { id: tempId, name: unsaved.name, method: unsaved.method, saved: false, dirty: false }])
    setActiveTabId(tempId)
    setEndpointData({
      id: tempId, name: unsaved.name, method: unsaved.method, path: unsaved.path,
      bodyType: unsaved.bodyType, bodyContent: unsaved.bodyContent, contentType: unsaved.contentType,
      timeout: unsaved.timeout, followRedirects: unsaved.followRedirects, baseUrl: unsaved.baseUrl,
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
        setEndpointData({
          id: detail.id, name: detail.name, method: detail.method as HTTPMethod,
          path: detail.path, bodyType: detail.bodyType as BodyType, bodyContent: detail.bodyContent,
          contentType: detail.contentType, timeout: detail.timeout, followRedirects: detail.followRedirects,
          baseUrl: "",
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
      sendData.moduleId = ""
      sendData.environmentId = getCurrentEnvironmentId(props.projectId)
      sendData.method = ep.method; sendData.baseUrl = ep.baseUrl; sendData.path = ep.path
      sendData.headers = []; sendData.params = []; sendData.bodyType = ep.bodyType
      sendData.bodyContent = ep.bodyContent; sendData.contentType = ep.contentType
      sendData.bodyFields = []; sendData.auth = null
      sendData.timeout = ep.timeout; sendData.followRedirects = ep.followRedirects

      const resp = await HTTPService.SendRequest(sendData)
      if (resp) {
        setResponseData({
          statusCode: resp.statusCode,
          timing: { total: resp.timing?.total || 0, dnsLookup: resp.timing?.dnsLookup || 0, tlsHandshake: resp.timing?.tlsHandshake || 0, tcpConnect: resp.timing?.tcpConnect || 0, ttfb: resp.timing?.ttfb || 0 },
          size: resp.size, body: resp.body, headers: resp.headers as any,
          cookies: resp.cookies as any || [], contentType: resp.contentType,
          actualRequest: resp.actualRequest,
        })
      }
    } catch (e) { console.error("发送请求失败", e) } finally { setSending(false) }
  }

  // ---- 保存逻辑 ----
  const handleSave = () => {
    const ct = requestTabs().find(t => t.id === activeTabId())
    if (!ct) return
    if (!ct.saved) {
      setSaveName(endpointData.name !== t("endpoint.newRequest") ? endpointData.name : "")
      const opts = buildSaveLocationOptions(treeData())
      if (opts.length > 0) setSelectedSaveLocation(opts[0].value)
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
        params: [], bodyFields: [], headers: [], auth: null,
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
      if (!moduleId) { console.error("未选择模块"); return }
      const created = await EndpointService.CreateFullEndpoint(moduleId, folderId ?? null, {
        id: "", name, method: ep.method, path: ep.path,
        bodyType: ep.bodyType, bodyContent: ep.bodyContent, contentType: ep.contentType,
        timeout: ep.timeout, followRedirects: ep.followRedirects,
        params: [], bodyFields: [], headers: [], auth: null,
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
        const opts = buildSaveLocationOptions(treeData())
        if (opts.length > 0) setSelectedSaveLocation(opts[0].value)
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

  // ---- 计算属性 ----
  const isActiveTabUnsaved = () => { const t = requestTabs().find(t => t.id === activeTabId()); return t ? !t.saved : false }
  const saveLocationOptions = () => buildSaveLocationOptions(treeData())

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
            onCreateEndpoint={() => createUnsavedTab()} onCreateFolder={openCreateFolder}
          />
        </div>}
        right={<div class="h-full">
          <Show when={requestTabs().length > 0}
            fallback={<div class="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <span>从左侧选择一个接口，或者</span>
              <Button onClick={createUnsavedTab} variant="outline">+ {t("endpoint.newRequest")}</Button>
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
              /> : null}
            </Tabs>
          </Show>
        </div>}
      />

      {/* 保存到项目对话框 */}
      <Dialog open={saveDialogOpen()} onClose={() => setSaveDialogOpen(false)} title={t("endpoint.saveToProjectTitle")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div><label class="block text-sm font-medium mb-1.5">{t("endpoint.name")}</label>
            <Input value={saveName()} onInput={e => setSaveName(e.currentTarget.value)} placeholder="GET /users" onKeyDown={e => e.key === "Enter" && handleSaveToProject()} />
          </div>
          <div><label class="block text-sm font-medium mb-1.5">{t("endpoint.selectModule")}</label>
            <select class="w-full rounded-md border border-border bg-input text-foreground px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              value={selectedSaveLocation()} onChange={e => setSelectedSaveLocation(e.currentTarget.value)}>
              <For each={saveLocationOptions()}>{option => <option value={option.value}>{option.label}</option>}</For>
            </select>
            <p class="text-xs text-muted-foreground mt-1">选择保存到哪个模块或文件夹</p>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveToProject} disabled={!saveName().trim() || saving()}>{saving() ? "保存中..." : t("endpoint.save")}</Button>
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
            <Button onClick={handleConfirmDelete} disabled={deleting()}>{deleting() ? "删除中..." : t("common.confirm")}</Button>
          </div>
        </div>
      </Dialog>

      {/* 创建文件夹对话框 */}
      <Dialog open={createFolderOpen()} onClose={() => setCreateFolderOpen(false)} title={t("folder.create")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("folder.name")}</label>
            <Input
              value={newFolderName()}
              onInput={(e) => setNewFolderName(e.currentTarget.value)}
              placeholder={t("folder.name")}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName().trim()}>
              {t("common.confirm")}
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
