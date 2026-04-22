// 接口管理主界面组件
// 左侧树形面板 + 右侧多 Tab 端点详情编辑器
import { createSignal, Show, For, onMount } from 'solid-js'
import { t } from '@/hooks/useI18n'
import { SplitPane } from '@/components/ui/split-pane'
import { EndpointTree, type TreeNode } from '@/components/endpoint/EndpointTree'
import { EndpointDetail, type EndpointData, type ResponseData } from '@/components/endpoint/EndpointDetail'
import { Tabs } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-solid'
import {
    ProjectService,
    ModuleService,
    EnvironmentService,
    EndpointService,
    FolderService,
    HTTPService,
} from '@/../bindings/post-pigeon/internal/services'
import type { ModuleTree, FolderTree, EndpointDetail as EndpointDetailType, HTTPResponseData } from '@/../bindings/post-pigeon/internal/services'
import { SendRequestData } from '@/../bindings/post-pigeon/internal/services'
import { getCurrentEnvironmentId, setCurrentEnvironment } from '@/stores/app'
import { type HTTPMethod, type BodyType, METHOD_COLORS } from '@/lib/types'

export interface ApiManagementProps {
    projectId: string
    modules: any[]
    environments: any[]
    currentEnvId: string
    onEnvironmentChange: (envId: string) => void
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

    // 加载项目树数据
    const loadTree = async () => {
        try {
            const tree = await ProjectService.GetProjectTree(props.projectId)
            setTreeData((tree || []).map(mapModule))
        } catch (e) {
            console.error('加载项目树失败', e)
        }
    }

    onMount(loadTree)

    // 映射模块为树节点
    const mapModule = (m: ModuleTree): TreeNode => ({
        id: m.id,
        type: 'module',
        name: m.name,
        children: [
            ...(m.folders || []).map(mapFolder),
            ...(m.endpoints || []).map(mapEndpoint),
        ],
    })

    // 映射文件夹为树节点
    const mapFolder = (f: FolderTree): TreeNode => ({
        id: f.id,
        type: 'folder',
        name: f.name,
        children: [
            ...(f.children || []).map(mapFolder),
            ...(f.endpoints || []).map(mapEndpoint),
        ],
    })

    // 映射端点为树节点
    const mapEndpoint = (e: any): TreeNode => ({
        id: e.id,
        type: 'endpoint',
        name: e.name,
        method: e.method as HTTPMethod,
    })

    // 选中端点节点
    const handleSelectNode = async (node: TreeNode) => {
        if (node.type !== 'endpoint') return
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
                    baseUrl: '',
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
            console.error('加载端点详情失败', e)
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
            sendData.moduleId = ''
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
            console.error('发送请求失败', e)
        } finally {
            setSending(false)
        }
    }

    // 环境选项
    const envOptions = () => [
        { value: '', label: 'Default' },
        ...props.environments.map((e: any) => ({ value: e.id, label: e.name })),
    ]

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
        <SplitPane
            defaultSize={280}
            minSize={150}
            maxSize={500}
            collapsed={sidebarCollapsed()}
            onCollapsedChange={setSidebarCollapsed}
            left={
                <div class="flex flex-col h-full border-r border-border">
                    {/* 环境选择 */}
                    <div class="flex items-center gap-1 p-2 border-b border-border shrink-0">
                        <Select
                            options={envOptions()}
                            value={props.currentEnvId}
                            onChange={(v) => props.onEnvironmentChange(v)}
                            size="sm"
                            class="flex-1"
                        />
                        <Button variant="ghost" size="icon-sm">
                            <Settings class="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {/* 接口树 */}
                    <EndpointTree
                        data={treeData()}
                        selectedId={selectedEndpointId() || undefined}
                        onSelect={handleSelectNode}
                        onCollapse={() => setSidebarCollapsed(true)}
                    />
                </div>
            }
            right={
                <div class="h-full">
                    <Show
                        when={openTabs().length > 0}
                        fallback={
                            <div class="flex items-center justify-center h-full text-muted-foreground">
                                选择或创建一个接口开始
                            </div>
                        }
                    >
                        <Tabs
                            tabs={openTabs().map(tab => ({
                                key: tab.id,
                                label: `${tab.method} ${tab.name}`,
                                closable: true,
                            }))}
                            value={selectedEndpointId() || ''}
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
    )
}
