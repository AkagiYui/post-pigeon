// 接口管理主界面组件
// 左侧树形面板 + 右侧多 Tab 端点详情编辑器
import { createSignal, For, onMount, Show } from "solid-js"

import type { EndpointDetail as EndpointDetailType, FolderTree, HTTPResponseData, ModuleTree } from "@/../bindings/post-pigeon/internal/services"
import {
  EndpointService,
  EnvironmentService,
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
import { type BodyType, type HTTPMethod, METHOD_COLORS } from "@/lib/types"
import { getCurrentEnvironmentId } from "@/stores/app"

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
  const [selectedEndpointId, setSelectedEndpointId] = createSignal<string | null>(null)
  const [openTabs, setOpenTabs] = createSignal<{ id: string; name: string; method: HTTPMethod }[]>([])
  const [endpointData, setEndpointData] = createSignal<EndpointData | null>(null)
  const [responseData, setResponseData] = createSignal<ResponseData | null>(null)
  const [sending, setSending] = createSignal(false)

  // 创建接口对话框状态
  const [createEndpointOpen, setCreateEndpointOpen] = createSignal(false)
  const [newEndpointName, setNewEndpointName] = createSignal("")
  const [createEndpointParentId, setCreateEndpointParentId] = createSignal<string | undefined>()
  const [createEndpointParentType, setCreateEndpointParentType] = createSignal<"module" | "folder">("module")

  // 创建文件夹对话框状态
  const [createFolderOpen, setCreateFolderOpen] = createSignal(false)
  const [newFolderName, setNewFolderName] = createSignal("")
  const [createFolderParentId, setCreateFolderParentId] = createSignal<string | undefined>()
  const [createFolderParentType, setCreateFolderParentType] = createSignal<"module" | "folder">("module")

  // 打开创建接口对话框
  const openCreateEndpoint = (parentId: string | undefined, type: "module" | "folder") => {
    setCreateEndpointParentId(parentId)
    setCreateEndpointParentType(type)
    setNewEndpointName("")
    setCreateEndpointOpen(true)
  }

  // 打开创建文件夹对话框
  const openCreateFolder = (parentId: string | undefined, type: "module" | "folder") => {
    setCreateFolderParentId(parentId)
    setCreateFolderParentType(type)
    setNewFolderName("")
    setCreateFolderOpen(true)
  }

  // 从空白状态创建接口——取第一个模块作为父节点
  const handleCreateFromEmpty = () => {
    const modules = treeData()
    if (modules.length > 0) {
      openCreateEndpoint(modules[0].id, "module")
    }
  }

  // 执行创建接口
  const handleCreateEndpoint = async () => {
    const name = newEndpointName().trim()
    if (!name) return

    try {
      // 根据父节点类型获取 moduleId
      const parentId = createEndpointParentId()
      const parentType = createEndpointParentType()
      // 从树数据中查找所属 moduleId
      const moduleId = findModuleId(treeData(), parentId, parentType)

      if (!moduleId) {
        console.error("无法确定所属模块 ID")
        return
      }

      // 如果是文件夹下创建，传入 folderId；否则为 null
      const folderId = parentType === "folder" ? parentId : null
      // 默认方法为 GET，路径为 / 加上名称的 kebab-case 形式
      const defaultPath = `/${name.toLowerCase().replace(/\s+/g, "-")}`

      await EndpointService.CreateEndpoint(moduleId, folderId ?? null, name, "GET", defaultPath)
      setCreateEndpointOpen(false)
      // 重新加载树
      await loadTree()
    } catch (e) {
      console.error("创建接口失败", e)
    }
  }

  // 执行创建文件夹
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
      // 重新加载树
      await loadTree()
    } catch (e) {
      console.error("创建文件夹失败", e)
    }
  }

  // 加载项目树数据
  const loadTree = async () => {
    try {
      const tree = await ProjectService.GetProjectTree(props.projectId)
      setTreeData((tree || []).map(mapModule))
    } catch (e) {
      console.error("加载项目树失败", e)
    }
  }

  onMount(loadTree)

  // 映射模块为树节点
  const mapModule = (m: ModuleTree): TreeNode => ({
    id: m.id,
    type: "module",
    name: m.name,
    children: [
      ...(m.folders || []).map(mapFolder),
      ...(m.endpoints || []).map(mapEndpoint),
    ],
  })

  // 映射文件夹为树节点
  const mapFolder = (f: FolderTree): TreeNode => ({
    id: f.id,
    type: "folder",
    name: f.name,
    children: [
      ...(f.children || []).map(mapFolder),
      ...(f.endpoints || []).map(mapEndpoint),
    ],
  })

  // 映射端点为树节点
  const mapEndpoint = (e: any): TreeNode => ({
    id: e.id,
    type: "endpoint",
    name: e.name,
    method: e.method as HTTPMethod,
  })

  // 从树数据中递归查找节点所属的模块 ID
  const findModuleId = (nodes: TreeNode[], nodeId: string | undefined, nodeType: "module" | "folder"): string | undefined => {
    for (const node of nodes) {
      if (nodeType === "module" && node.id === nodeId) {
        return node.id
      }
      if (node.children) {
        // 如果是文件夹，查找其父模块
        if (nodeType === "folder") {
          const found = node.children.find(c => c.id === nodeId && c.type === "folder")
          if (found) {
            // 如果在当前模块的直接子节点中找到该文件夹，返回当前模块 ID
            if (node.type === "module") return node.id
          }
        }
        // 递归查找子节点
        const result = findModuleId(node.children, nodeId, nodeType)
        if (result) return result
      }
    }
    return undefined
  }

  // 选中端点节点
  const handleSelectNode = async (node: TreeNode) => {
    if (node.type !== "endpoint") return
    setSelectedEndpointId(node.id)

    // 如果未在 tab 中打开，则添加
    if (!openTabs().find(t => t.id === node.id)) {
      setOpenTabs(prev => [...prev, { id: node.id, name: node.name, method: node.method! }])
    }

    // 加载端点详情
    try {
      const detail = await EndpointService.GetEndpoint(node.id)
      if (detail) {
        setEndpointData({
          id: detail.id,
          name: detail.name,
          method: detail.method as HTTPMethod,
          path: detail.path,
          bodyType: detail.bodyType as BodyType,
          bodyContent: detail.bodyContent,
          contentType: detail.contentType,
          timeout: detail.timeout,
          followRedirects: detail.followRedirects,
          baseUrl: "",
        })

        // 加载响应数据
        if (detail.response) {
          // 解析 timing JSON 字符串
          const timingInfo = detail.response.timing ? JSON.parse(detail.response.timing) : { total: 0, dnsLookup: 0, tlsHandshake: 0, tcpConnect: 0, ttfb: 0 }
          setResponseData({
            statusCode: detail.response.statusCode,
            timing: {
              total: timingInfo.total || 0,
              dnsLookup: timingInfo.dnsLookup || 0,
              tlsHandshake: timingInfo.tlsHandshake || 0,
              tcpConnect: timingInfo.tcpConnect || 0,
              ttfb: timingInfo.ttfb || 0,
            },
            size: detail.response.size,
            body: detail.response.body,
            headers: detail.response.headers as any,
            cookies: detail.response.cookies as any || [],
            contentType: detail.response.contentType,
            actualRequest: detail.response.actualRequest,
          })
        } else {
          setResponseData(null)
        }
      }
    } catch (e) {
      console.error("加载端点详情失败", e)
    }
  }

  // 发送请求
  const handleSend = async () => {
    const ep = endpointData()
    if (!ep) return
    setSending(true)
    try {
      const sendData = new SendRequestData()
      sendData.endpointId = ep.id
      sendData.moduleId = ""
      sendData.environmentId = getCurrentEnvironmentId(props.projectId)
      sendData.method = ep.method
      sendData.baseUrl = ep.baseUrl
      sendData.path = ep.path
      sendData.headers = []
      sendData.params = []
      sendData.bodyType = ep.bodyType
      sendData.bodyContent = ep.bodyContent
      sendData.contentType = ep.contentType
      sendData.bodyFields = []
      sendData.auth = null
      sendData.timeout = ep.timeout
      sendData.followRedirects = ep.followRedirects

      const resp = await HTTPService.SendRequest(sendData)

      if (resp) {
        setResponseData({
          statusCode: resp.statusCode,
          timing: {
            total: resp.timing?.total || 0,
            dnsLookup: resp.timing?.dnsLookup || 0,
            tlsHandshake: resp.timing?.tlsHandshake || 0,
            tcpConnect: resp.timing?.tcpConnect || 0,
            ttfb: resp.timing?.ttfb || 0,
          },
          size: resp.size,
          body: resp.body,
          headers: resp.headers as any,
          cookies: resp.cookies as any || [],
          contentType: resp.contentType,
          actualRequest: resp.actualRequest,
        })
      }
    } catch (e) {
      console.error("发送请求失败", e)
    } finally {
      setSending(false)
    }
  }

  // 关闭标签页
  const closeTab = (id: string) => {
    setOpenTabs(prev => prev.filter(t => t.id !== id))
    if (selectedEndpointId() === id) {
      const remaining = openTabs().filter(t => t.id !== id)
      setSelectedEndpointId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  // 切换标签页时重新加载数据
  const handleTabChange = (id: string) => {
    setSelectedEndpointId(id)
    const node = openTabs().find(t => t.id === id)
    if (node) {
      handleSelectNode(node as TreeNode)
    }
  }

  return (
    <>
      <SplitPane
        defaultSize={280}
        minSize={150}
        maxSize={500}
        collapsed={sidebarCollapsed()}
        onCollapsedChange={setSidebarCollapsed}
        left={
          <div class="flex flex-col h-full border-r border-border">
            {/* 接口树 */}
            <EndpointTree
              data={treeData()}
              selectedId={selectedEndpointId() || undefined}
              onSelect={handleSelectNode}
              onCollapse={() => setSidebarCollapsed(true)}
              onCreateEndpoint={openCreateEndpoint}
              onCreateFolder={openCreateFolder}
            />
          </div>
        }
        right={
          <div class="h-full">
            <Show
              when={openTabs().length > 0}
              fallback={
                <div class="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                  <span>从左侧选择一个接口，或者</span>
                  <Button onClick={handleCreateFromEmpty} variant="outline">
                    + 创建接口
                  </Button>
                </div>
              }
            >
              <Tabs
                tabs={openTabs().map(tab => ({
                  key: tab.id,
                  label: `${tab.method} ${tab.name}`,
                  closable: true,
                }))}
                value={selectedEndpointId() || ""}
                onChange={handleTabChange}
                onClose={closeTab}
              >
                {() => (
                  endpointData() ? (
                    <EndpointDetail
                      endpoint={endpointData()!}
                      response={responseData()}
                      sending={sending()}
                      onSend={handleSend}
                      onDelete={() => {
                        // TODO: 删除端点确认
                      }}
                      onChange={(data) => {
                        setEndpointData(prev => prev ? { ...prev, ...data } : null)
                      }}
                    />
                  ) : null
                )}
              </Tabs>
            </Show>
          </div>
        }
      />

      {/* 创建接口对话框 */}
      <Dialog open={createEndpointOpen()} onClose={() => setCreateEndpointOpen(false)} title={t("endpoint.create")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("endpoint.name")}</label>
            <Input
              value={newEndpointName()}
              onInput={(e) => setNewEndpointName(e.currentTarget.value)}
              placeholder="GET /users"
              onKeyDown={(e) => e.key === "Enter" && handleCreateEndpoint()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateEndpointOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateEndpoint} disabled={!newEndpointName().trim()}>
              {t("common.confirm")}
            </Button>
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
    </>
  )
}
