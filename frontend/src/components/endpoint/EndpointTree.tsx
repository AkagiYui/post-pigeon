// 接口树形面板组件
// 展示 Module > Folder > Endpoint 的树形结构
import { Ellipsis, FileText, Folder, FolderOpen, Package, PackageOpen, PackagePlus, PanelLeftClose, Plus, Search } from "lucide-solid"
import { createEffect, createSignal, For, Show } from "solid-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContextMenu, type MenuItem } from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Popover } from "@/components/ui/popover"
import { t } from "@/hooks/useI18n"
import { type HTTPMethod } from "@/lib/types"
import { cn } from "@/lib/utils"

/** 树节点数据类型 */
export interface TreeNode {
  id: string
  type: "module" | "folder" | "endpoint"
  name: string
  method?: HTTPMethod
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
export function EndpointTree(props: EndpointTreeProps) {
  const [searchQuery, setSearchQuery] = createSignal("")
  // 使用 string[] 而非 Set<string>，便于与外部缓存系统（序列化为 JSON）交互
  const [internalExpandedIds, setInternalExpandedIds] = createSignal<string[]>([])

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
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            size="sm"
            value={searchQuery()}
            onInput={(e) => handleSearch(e.currentTarget.value)}
            placeholder={t("endpoint.search")}
            class="pl-7"
          />
        </div>
        <Popover
          trigger={
            <Button variant="ghost" size="icon-sm">
              <Plus class="h-3.5 w-3.5" />
            </Button>
          }
          placement="bottom"
          class="p-0! min-w-45 rounded-md"
        >
          <div class="flex flex-col py-1">
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => props.onCreateModule?.()}
            >
              <PackagePlus class="h-4 w-4 text-sky-500 shrink-0" />
              <span>{t("module.create")}</span>
            </div>
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => props.onCreateFolder?.(undefined, "module")}
            >
              <Folder class="h-4 w-4 text-amber-500 shrink-0" />
              <span>{t("folder.create")}</span>
            </div>
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => props.onCreateEndpoint?.(undefined, "module")}
            >
              <FileText class="h-4 w-4 text-blue-500 shrink-0" />
              <span>{t("endpoint.create")}</span>
            </div>
          </div>
        </Popover>
        <Button variant="ghost" size="icon-sm" onClick={props.onCollapse}>
          <PanelLeftClose class="h-3.5 w-3.5" />
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
              onCreateEndpoint={props.onCreateEndpoint}
              onCreateFolder={props.onCreateFolder}
              onRename={props.onRename}
              onCopy={props.onCopy}
              onDelete={props.onDelete}
              onMove={props.onMove}
            />
          )}
        </For>
      </div>
    </div>
  )
}

/** 根据节点类型创建右键菜单项 */
function createMenuItems(
  node: TreeNode,
  onCreateEndpoint: EndpointTreeProps["onCreateEndpoint"],
  onCreateFolder: EndpointTreeProps["onCreateFolder"],
): MenuItem[] {
  if (node.type === "module") {
    return [
      {
        key: "new-endpoint",
        label: t("endpoint.create"),
        onClick: () => onCreateEndpoint?.(node.id, "module"),
      },
      {
        key: "new-folder",
        label: t("folder.create"),
        onClick: () => onCreateFolder?.(node.id, "module"),
      },
    ]
  }
  if (node.type === "folder") {
    return [
      {
        key: "new-endpoint",
        label: t("endpoint.create"),
        onClick: () => onCreateEndpoint?.(node.id, "folder"),
      },
      {
        key: "new-folder",
        label: t("folder.create"),
        onClick: () => onCreateFolder?.(node.id, "folder"),
      },
    ]
  }
  return []
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
  onCreateEndpoint?: EndpointTreeProps["onCreateEndpoint"]
  onCreateFolder?: EndpointTreeProps["onCreateFolder"]
  onRename?: EndpointTreeProps["onRename"]
  onCopy?: EndpointTreeProps["onCopy"]
  onDelete?: EndpointTreeProps["onDelete"]
  onMove?: EndpointTreeProps["onMove"]
}) {
  const isExpanded = () => props.expandedIds.has(props.node.id)
  const isSelected = () => props.selectedId === props.node.id
  const hasChildren = () => (props.node.children?.length || 0) > 0

  // 三点菜单的打开状态和位置（基于点击坐标，与右键菜单位置逻辑一致）
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 })

  const handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }

  const handleMenuAction = (action: () => void) => {
    action()
    setMenuOpen(false)
  }

  return (
    <ContextMenu items={createMenuItems(props.node, props.onCreateEndpoint, props.onCreateFolder)}>
      <div>
        {/* 节点行 */}
        <div
          class={cn(
            "flex items-center gap-1 py-1 pr-1 cursor-pointer transition-colors text-sm group",
            isSelected() ? "bg-accent-muted text-accent" : "hover:bg-muted text-foreground",
          )}
          style={{ "padding-left": `${props.level * 16 + 8}px` }}
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
              ? <PackageOpen class="h-3.5 w-3.5 text-sky-500 shrink-0" />
              : <Package class="h-3.5 w-3.5 text-sky-500 shrink-0" />}
          </Show>
          <Show when={props.node.type === "folder"}>
            {isExpanded()
              ? <FolderOpen class="h-3.5 w-3.5 text-amber-500 shrink-0" />
              : <Folder class="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          </Show>
          <Show when={props.node.type === "endpoint" && props.node.method}>
            <Badge variant={props.node.method!.toLowerCase() as any} class="text-[10px] px-1 py-0 shrink-0">
              {props.node.method}
            </Badge>
          </Show>

          {/* 名称 */}
          <span class="truncate flex-1">{props.node.name}</span>

          {/* 更多操作按钮（悬停显示） */}
          <div class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon-sm" class="h-5 w-5" onClick={handleMenuClick}>
              <Ellipsis class="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* 三点弹出菜单（与右键菜单相同的位置逻辑和样式） */}
        <Show when={menuOpen()}>
          {/* 遮罩层，点击关闭 */}
          <div
            class="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false) }}
          />
          <div
            class="fixed z-50 min-w-45 bg-surface border border-border rounded-md shadow-lg py-1"
            style={{ left: `${menuPos().x}px`, top: `${menuPos().y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => handleMenuAction(() => props.onRename?.(props.node))}
            >
              {t("common.rename")}
            </div>
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => handleMenuAction(() => props.onCopy?.(props.node))}
            >
              {t("common.copy")}
            </div>
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => handleMenuAction(() => props.onDelete?.(props.node))}
            >
              {t("common.delete")}
            </div>
            <div
              class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none text-foreground hover:bg-accent-muted hover:text-accent"
              onClick={() => handleMenuAction(() => props.onMove?.(props.node))}
            >
              {t("common.move")}
            </div>
          </div>
        </Show>

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
                onCreateEndpoint={props.onCreateEndpoint}
                onCreateFolder={props.onCreateFolder}
                onRename={props.onRename}
                onCopy={props.onCopy}
                onDelete={props.onDelete}
                onMove={props.onMove}
              />
            )}
          </For>
        </Show>
      </div>
    </ContextMenu>
  )
}
