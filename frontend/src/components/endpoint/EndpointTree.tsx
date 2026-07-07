// 接口树形面板组件
// 展示 Module > Folder > Endpoint 的树形结构
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, For, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { ContextMenu, type MenuItem } from "@/components/ui/context-menu"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MethodBadge } from "@/components/ui/method-badge"
import { t } from "@/hooks/useI18n"
import { type EndpointType, type HTTPMethod } from "@/lib/types"
import { cn } from "@/lib/utils"

/** 树节点数据类型 */
export interface TreeNode {
  id: string
  type: "module" | "folder" | "endpoint"
  name: string
  method?: HTTPMethod
  /** 端点类型：http / doc / websocket / sse（仅 type=endpoint 时有效） */
  endpointType?: EndpointType
  /** 端点路径（仅 type=endpoint 时有效，供"接口显示为 URL"使用） */
  path?: string
  /** 接口显示方式：name（默认）/ url（仅 type=module 时有效，向下继承） */
  endpointDisplay?: "name" | "url"
  children?: TreeNode[]
  parentId?: string
}

export interface EndpointTreeProps {
  /** 树数据 */
  data: TreeNode[]
  /** 当前选中的端点 ID */
  selectedId?: string
  /** 选中回调 */
  onSelect?: (node: TreeNode) => void
  /** 创建模块回调 */
  onCreateModule?: () => void
  /** 创建端点回调 */
  onCreateEndpoint?: (parentId: string | undefined, type: "module" | "folder") => void
  /** 创建 WebSocket 端点回调 */
  onCreateTyped?: (parentId: string | undefined, type: "module" | "folder", endpointType: "websocket") => void
  /** 创建文件夹回调 */
  onCreateFolder?: (parentId: string | undefined, type: "module" | "folder") => void
  /** 搜索框文字变更 */
  onSearch?: (query: string) => void
  /** 收起面板回调 */
  onCollapse?: () => void
  /** 重命名回调 */
  onRename?: (node: TreeNode) => void
  /** 复制回调 */
  onCopy?: (node: TreeNode) => void
  /** 删除回调 */
  onDelete?: (node: TreeNode) => void
  /** 移动回调 */
  onMove?: (node: TreeNode) => void
  /** 导入 OpenAPI 文档回调（仅模块节点提供） */
  onImportOpenAPI?: (node: TreeNode) => void
  /** 导入 Apifox 导出文件回调（项目级） */
  onImportApifox?: () => void
  /** 新建文档回调（模块/文件夹节点提供） */
  onCreateDocument?: (parentId: string | undefined, type: "module" | "folder") => void
  /** 打开模块/文件夹设置（认证/自动参数/前置后置操作） */
  onOpenSettings?: (node: TreeNode) => void
  /** 将文件夹转换为模块（仅文件夹节点提供） */
  onConvertToModule?: (node: TreeNode) => void
  /** 设置模块下接口显示方式（name 名称 / url 路径） */
  onSetEndpointDisplay?: (moduleId: string, mode: "name" | "url") => void
  /** 端点拖拽排序：orderedIds 为拖拽后同容器内的兄弟端点顺序 */
  onReorderEndpoints?: (orderedIds: string[]) => void
  /** 默认模块 ID：默认模块不可删除、不可移动 */
  defaultModuleId?: string
  /** 外部控制的展开节点 ID 列表（配合 onExpandedChange 使用，用于路由状态缓存） */
  expandedIds?: string[]
  /** 展开状态变化回调 */
  onExpandedChange?: (ids: string[]) => void
  /** 自定义类名 */
  class?: string
}

/**
 * EndpointTree 接口树形面板
 */
/** 端点拖拽排序状态与回调 */
export interface TreeDnd {
  dragId: () => string | null
  overId: () => string | null
  overPos: () => "before" | "after"
  start: (id: string) => void
  over: (id: string, pos: "before" | "after") => void
  drop: () => void
  end: () => void
}

/** 在树中查找直接包含指定 id 的兄弟数组（返回同一数组引用用于判断是否同容器） */
function findSiblingArray(nodes: TreeNode[], id: string): TreeNode[] | null {
  if (nodes.some(n => n.id === id)) return nodes
  for (const n of nodes) {
    if (n.children) {
      const r = findSiblingArray(n.children, id)
      if (r) return r
    }
  }
  return null
}

export function EndpointTree(props: EndpointTreeProps) {
  const [searchQuery, setSearchQuery] = createSignal("")
  // 使用 string[] 而非 Set<string>，便于与外部缓存系统（序列化为 JSON）交互
  const [internalExpandedIds, setInternalExpandedIds] = createSignal<string[]>([])

  // ---- 端点拖拽排序 ----
  const [dragId, setDragId] = createSignal<string | null>(null)
  const [overId, setOverId] = createSignal<string | null>(null)
  const [overPos, setOverPos] = createSignal<"before" | "after">("before")

  const handleDrop = () => {
    const dId = dragId()
    const oId = overId()
    if (!dId || !oId || dId === oId) return
    const dSibs = findSiblingArray(props.data, dId)
    const oSibs = findSiblingArray(props.data, oId)
    // 仅允许同容器内的端点互相排序
    if (!dSibs || dSibs !== oSibs) return
    const ids = dSibs.filter(n => n.type === "endpoint").map(n => n.id)
    const from = ids.indexOf(dId)
    if (from < 0) return
    ids.splice(from, 1)
    let to = ids.indexOf(oId)
    if (to < 0) return
    if (overPos() === "after") to += 1
    ids.splice(to, 0, dId)
    props.onReorderEndpoints?.(ids)
  }

  const dnd: TreeDnd = {
    dragId, overId, overPos,
    start: (id) => { setDragId(id); setOverId(null) },
    over: (id, pos) => { setOverId(id); setOverPos(pos) },
    drop: handleDrop,
    end: () => { setDragId(null); setOverId(null) },
  }

  // 统一获取展开 ID 列表：优先使用外部 prop，否则使用内部状态
  const getExpandedList = () => props.expandedIds ?? internalExpandedIds()

  // 统一更新展开 ID 列表：有外部回调则调用外部，否则更新内部状态
  const updateExpandedList = (fn: (prev: string[]) => string[]) => {
    if (props.onExpandedChange) {
      props.onExpandedChange(fn(props.expandedIds ?? []))
    } else {
      setInternalExpandedIds(fn)
    }
  }

  // 首次加载树数据时，自动展开第一个模块节点（仅初始化一次，避免后续 data 变化覆盖用户的手动操作）
  let initialized = false
  createEffect(() => {
    const data = props.data
    // 数据尚未加载时不做处理，等数据到达后再初始化
    if (data.length === 0) return
    if (initialized) return
    const firstModule = data[0]
    if (firstModule.type === "module") {
      updateExpandedList(prev => {
        if (prev.includes(firstModule.id)) return prev
        return [...prev, firstModule.id]
      })
    }
    initialized = true
  })

  const toggleExpand = (id: string) => {
    updateExpandedList(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id)
      return [...prev, id]
    })
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    props.onSearch?.(query)
  }

  // 根据搜索关键词过滤树数据，只保留匹配的节点及其祖先路径
  const filteredData = () => {
    const query = searchQuery()
    if (!query) return props.data
    return filterTree(props.data, query)
  }

  // 搜索模式下自动展开所有父节点以显示匹配结果；非搜索模式使用手动展开状态
  const effectiveExpandedIds = (): Set<string> => {
    const query = searchQuery()
    if (!query) return new Set(getExpandedList())
    const ids = new Set<string>()
    const collectIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          ids.add(node.id)
          collectIds(node.children)
        }
      }
    }
    collectIds(filteredData())
    return ids
  }

  return (
    <div class={cn("flex flex-col h-full", props.class)}>
      {/* 搜索框和操作栏 */}
      <div class="flex items-center gap-2 p-2 border-b border-border shrink-0">
        <div class="flex-1 relative">
          <Icon icon="lucide:search" class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            size="sm"
            value={searchQuery()}
            onInput={(e) => handleSearch(e.currentTarget.value)}
            placeholder={t("endpoint.search")}
            class="pl-7"
          />
        </div>
        <DropdownMenu
          trigger="click"
          placement="anchor-bottom"
          items={[
            {
              key: "new-module",
              label: t("module.create"),
              icon: <Icon icon="lucide:package-plus" class="h-4 w-4 text-sky-500 shrink-0" />,
              onClick: () => props.onCreateModule?.(),
            },
            {
              key: "new-folder",
              label: t("folder.create"),
              icon: <Icon icon="lucide:folder-plus" class="h-4 w-4 text-amber-500 shrink-0" />,
              onClick: () => props.onCreateFolder?.(undefined, "module"),
            },
            {
              key: "new-endpoint",
              label: t("endpoint.create"),
              icon: <Icon icon="lucide:file-plus-corner" class="h-4 w-4 text-blue-500 shrink-0" />,
              onClick: () => props.onCreateEndpoint?.(undefined, "module"),
            },
            {
              key: "new-websocket",
              label: t("endpoint.createWebSocket"),
              icon: <Icon icon="lucide:webhook" class="h-4 w-4 text-teal-500 shrink-0" />,
              onClick: () => props.onCreateTyped?.(undefined, "module", "websocket"),
            },
            {
              key: "new-document",
              label: t("doc.create"),
              icon: <Icon icon="lucide:file-text" class="h-4 w-4 text-violet-500 shrink-0" />,
              onClick: () => props.onCreateDocument?.(undefined, "module"),
            },
            { key: "sep-import", label: "", separator: true },
            {
              key: "import-apifox",
              label: t("apifox.import"),
              icon: <Icon icon="lucide:file-down" class="h-4 w-4 text-orange-500 shrink-0" />,
              onClick: () => props.onImportApifox?.(),
            },
          ]}
        >
          <Button variant="ghost" size="icon-sm">
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
          </Button>
        </DropdownMenu>
        <Button variant="ghost" size="icon-sm" onClick={props.onCollapse}>
          <Icon icon="lucide:panel-left-close" class="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 树形内容 */}
      <div class="flex-1 overflow-auto">
        <For each={filteredData()}>
          {(node) => (
            <TreeNodeItem
              node={node}
              level={0}
              selectedId={props.selectedId}
              expandedIds={effectiveExpandedIds()}
              onSelect={props.onSelect}
              onToggle={toggleExpand}
              handlers={props}
              defaultModuleId={props.defaultModuleId}
              dnd={dnd}
            />
          )}
        </For>
      </div>
    </div>
  )
}

/** 创建节点的完整菜单项（右键菜单和弹出菜单共享） */
function createAllMenuItems(
  node: TreeNode,
  handlers: Pick<EndpointTreeProps, "onCreateEndpoint" | "onCreateTyped" | "onCreateFolder" | "onCreateDocument" | "onRename" | "onCopy" | "onDelete" | "onMove" | "onImportOpenAPI" | "onOpenSettings" | "onSetEndpointDisplay" | "onConvertToModule">,
  isProtected: boolean,
): MenuItem[] {
  const items: MenuItem[] = []

  // 模块和文件夹：新建接口、WebSocket、SSE、文件夹、文档
  if (node.type === "module" || node.type === "folder") {
    const scope = node.type as "module" | "folder"
    items.push(
      {
        key: "new-endpoint",
        label: t("endpoint.create"),
        icon: <Icon icon="lucide:file-plus-corner" class="h-4 w-4 text-blue-500 shrink-0" />,
        onClick: () => handlers.onCreateEndpoint?.(node.id, scope),
      },
      {
        key: "new-websocket",
        label: t("endpoint.createWebSocket"),
        icon: <Icon icon="lucide:webhook" class="h-4 w-4 text-teal-500 shrink-0" />,
        onClick: () => handlers.onCreateTyped?.(node.id, scope, "websocket"),
      },
      {
        key: "new-folder",
        label: t("folder.create"),
        icon: <Icon icon="lucide:folder-plus" class="h-4 w-4 text-amber-500 shrink-0" />,
        onClick: () => handlers.onCreateFolder?.(node.id, scope),
      },
      {
        key: "new-document",
        label: t("doc.create"),
        icon: <Icon icon="lucide:file-text" class="h-4 w-4 text-violet-500 shrink-0" />,
        onClick: () => handlers.onCreateDocument?.(node.id, scope),
      },
    )
    // 模块节点：导入 OpenAPI + 接口显示方式切换
    if (node.type === "module") {
      items.push({
        key: "import-openapi",
        label: t("openapi.import"),
        icon: <Icon icon="lucide:file-down" class="h-4 w-4 text-emerald-500 shrink-0" />,
        onClick: () => handlers.onImportOpenAPI?.(node),
      })
      const mode = node.endpointDisplay === "url" ? "url" : "name"
      items.push(
        { key: "sep-display", label: "", separator: true },
        {
          key: "display-name",
          label: t("module.displayAsName"),
          icon: mode === "name" ? <Icon icon="lucide:check" class="h-4 w-4 text-accent shrink-0" /> : <span class="w-4 shrink-0" />,
          onClick: () => handlers.onSetEndpointDisplay?.(node.id, "name"),
        },
        {
          key: "display-url",
          label: t("module.displayAsUrl"),
          icon: mode === "url" ? <Icon icon="lucide:check" class="h-4 w-4 text-accent shrink-0" /> : <span class="w-4 shrink-0" />,
          onClick: () => handlers.onSetEndpointDisplay?.(node.id, "url"),
        },
      )
    }
    // 模块/文件夹级设置：认证、自动参数、前置/后置操作
    items.push({
      key: "scope-settings",
      label: t("scope.settings"),
      icon: <Icon icon="lucide:settings-2" class="h-4 w-4 text-slate-500 shrink-0" />,
      onClick: () => handlers.onOpenSettings?.(node),
    })
    // 文件夹：转换为模块（文件夹升级为独立模块）
    if (node.type === "folder") {
      items.push({
        key: "convert-to-module",
        label: t("folder.convertToModule"),
        icon: <Icon icon="lucide:package-plus" class="h-4 w-4 text-sky-500 shrink-0" />,
        onClick: () => handlers.onConvertToModule?.(node),
      })
    }
    items.push({ key: "separator-1", label: "", separator: true })
  }

  // 所有节点：重命名、复制
  items.push(
    { key: "rename", label: t("common.rename"), icon: <Icon icon="lucide:pencil" class="h-4 w-4 shrink-0" />, onClick: () => handlers.onRename?.(node) },
    { key: "copy", label: t("common.copy"), icon: <Icon icon="lucide:copy" class="h-4 w-4 shrink-0" />, onClick: () => handlers.onCopy?.(node) },
  )

  // 移动：模块为顶层节点不可移动；受保护的默认模块也不可移动
  if (node.type !== "module") {
    items.push({ key: "move", label: t("common.move"), icon: <Icon icon="lucide:arrow-up-down" class="h-4 w-4 shrink-0" />, onClick: () => handlers.onMove?.(node) })
  }

  // 删除：受保护的默认模块不可删除
  if (!isProtected) {
    items.push({ key: "delete", label: t("common.delete"), icon: <Icon icon="lucide:trash-2" class="h-4 w-4 shrink-0" />, onClick: () => handlers.onDelete?.(node) })
  }

  return items
}

/** 递归过滤树节点，只保留匹配搜索的节点及其祖先路径 */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  const result: TreeNode[] = []
  for (const node of nodes) {
    const nodeMatches = node.name.toLowerCase().includes(q)
    const filteredChildren = node.children ? filterTree(node.children, query) : undefined
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0
    if (nodeMatches || hasMatchingChildren) {
      result.push({
        ...node,
        children: hasMatchingChildren ? filteredChildren : undefined,
      })
    }
  }
  return result
}

/** 树节点渲染 */
function TreeNodeItem(props: {
  node: TreeNode
  level: number
  selectedId?: string
  expandedIds: Set<string>
  onSelect?: (node: TreeNode) => void
  onToggle: (id: string) => void
  handlers: Pick<EndpointTreeProps, "onCreateEndpoint" | "onCreateTyped" | "onCreateFolder" | "onCreateDocument" | "onRename" | "onCopy" | "onDelete" | "onMove" | "onImportOpenAPI" | "onOpenSettings" | "onSetEndpointDisplay" | "onConvertToModule">
  defaultModuleId?: string
  /** 由祖先模块向下继承的接口显示方式 */
  displayMode?: "name" | "url"
  /** 端点拖拽排序 */
  dnd?: TreeDnd
}) {
  const isExpanded = () => props.expandedIds.has(props.node.id)
  const isSelected = () => props.selectedId === props.node.id
  const hasChildren = () => (props.node.children?.length || 0) > 0

  // 模块节点确立显示方式并向下继承；其它节点沿用祖先值
  const childDisplayMode = (): "name" | "url" =>
    props.node.type === "module" ? (props.node.endpointDisplay === "url" ? "url" : "name") : (props.displayMode || "name")

  // 端点标签：URL 模式显示路径，否则显示名称
  const labelText = () =>
    props.node.type === "endpoint" && props.displayMode === "url" ? (props.node.path || props.node.name) : props.node.name

  // ---- 拖拽排序（仅端点） ----
  const isEndpoint = () => props.node.type === "endpoint"
  const isDragging = () => props.dnd?.dragId() === props.node.id
  // 拖拽经过时的落点指示线（inset 阴影，避免撑高行高）
  const dropShadow = () => {
    const d = props.dnd
    if (!d || d.overId() !== props.node.id || !d.dragId() || d.dragId() === props.node.id) return undefined
    return d.overPos() === "before" ? "inset 0 2px 0 0 var(--color-accent)" : "inset 0 -2px 0 0 var(--color-accent)"
  }
  const handleDragStart = (e: DragEvent) => {
    if (!isEndpoint() || !props.dnd) return
    e.dataTransfer!.effectAllowed = "move"
    e.dataTransfer!.setData("text/plain", props.node.id)
    props.dnd.start(props.node.id)
  }
  const handleDragOver = (e: DragEvent) => {
    if (!isEndpoint() || !props.dnd?.dragId()) return
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    props.dnd.over(props.node.id, e.clientY - rect.top < rect.height / 2 ? "before" : "after")
  }
  const handleDrop = (e: DragEvent) => {
    if (!isEndpoint()) return
    e.preventDefault()
    props.dnd?.drop()
  }

  // 默认模块受保护（不可删除、不可移动）
  const isProtected = () => props.node.type === "module" && props.node.id === props.defaultModuleId

  // 统一的菜单项（右键菜单和弹出菜单共享）
  const menuItems = () => createAllMenuItems(props.node, props.handlers, isProtected())

  return (
    <ContextMenu items={menuItems()}>
      <div>
        {/* 节点行 */}
        <div
          draggable={isEndpoint()}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={() => props.dnd?.end()}
          class={cn(
            "flex items-center gap-1 py-1 pr-1 cursor-pointer transition-colors text-sm group",
            isSelected() ? "bg-accent-muted text-accent" : "hover:bg-muted text-foreground",
            isDragging() && "opacity-40",
          )}
          style={{ "padding-left": `${props.level * 16 + 8}px`, "box-shadow": dropShadow() }}
          onClick={() => {
            // 模块和文件夹点击切换展开/收起（即使无子节点，图标也会变化）
            if (props.node.type !== "endpoint") {
              props.onToggle(props.node.id)
            }
            if (props.node.type === "endpoint") {
              props.onSelect?.(props.node)
            }
          }}
        >
          {/* 展开/折叠图标（接口类型是叶子节点，不显示；其余类型即使无子节点也保持视觉一致性） */}
          <Show when={props.node.type !== "endpoint"}>
            <span class="shrink-0" />
          </Show>
          <Show when={props.node.type === "endpoint"}>
            <span class="shrink-0" />
          </Show>

          {/* 图标 */}
          <Show when={props.node.type === "module"}>
            {isExpanded()
              ? <Icon icon="lucide:package-open" class="h-3.5 w-3.5 text-sky-500 shrink-0" />
              : <Icon icon="lucide:package" class="h-3.5 w-3.5 text-sky-500 shrink-0" />}
          </Show>
          <Show when={props.node.type === "folder"}>
            {isExpanded()
              ? <Icon icon="lucide:folder-open" class="h-3.5 w-3.5 text-amber-500 shrink-0" />
              : <Icon icon="lucide:folder" class="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          </Show>
          {/* 端点叶子图标：文档 / WebSocket / SSE 使用独立图标，普通接口显示方法徽章 */}
          <Show when={props.node.type === "endpoint"}>
            <Show when={props.node.endpointType === "doc"}>
              <Icon icon="lucide:file-text" class="h-3.5 w-3.5 text-violet-500 shrink-0" />
            </Show>
            <Show when={props.node.endpointType === "websocket"}>
              <Icon icon="lucide:webhook" class="h-3.5 w-3.5 text-teal-500 shrink-0" />
            </Show>
            <Show when={props.node.endpointType === "sse"}>
              <Icon icon="lucide:radio" class="h-3.5 w-3.5 text-pink-500 shrink-0" />
            </Show>
            <Show when={(!props.node.endpointType || props.node.endpointType === "http") && props.node.method}>
              {/* 方法徽章：无底色，仅用文字颜色区分；自适应宽度，与接口 Tab 栏一致（靠 gap-1 与名称留白） */}
              <MethodBadge method={props.node.method} />
            </Show>
          </Show>

          {/* 名称（URL 模式下端点显示路径） */}
          <span class="truncate flex-1">{labelText()}</span>

          {/* 更多操作按钮（悬停显示）：阻止点击冒泡到行，避免呼出菜单的同时切换/展开节点 */}
          <div class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              trigger="click"
              placement="cursor"
              items={menuItems()}
            >
              <Button variant="ghost" size="icon-sm" class="h-5 w-5">
                <Icon icon="lucide:ellipsis" class="h-3 w-3" />
              </Button>
            </DropdownMenu>
          </div>
        </div>

        {/* 子节点 */}
        <Show when={hasChildren() && isExpanded()}>
          <For each={props.node.children}>
            {(child) => (
              <TreeNodeItem
                node={child}
                level={props.level + 1}
                selectedId={props.selectedId}
                expandedIds={props.expandedIds}
                onSelect={props.onSelect}
                onToggle={props.onToggle}
                handlers={props.handlers}
                defaultModuleId={props.defaultModuleId}
                displayMode={childDisplayMode()}
                dnd={props.dnd}
              />
            )}
          </For>
        </Show>
      </div>
    </ContextMenu>
  )
}
