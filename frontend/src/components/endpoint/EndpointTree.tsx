// 接口树形面板组件
// 展示 Module > Folder > Endpoint 的树形结构
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, PanelLeftClose, Plus, Search } from "lucide-solid"
import { createEffect, createSignal, For, Show } from "solid-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContextMenu, type MenuItem } from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
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
  /** 创建端点回调 */
  onCreateEndpoint?: (parentId: string | undefined, type: "module" | "folder") => void
  /** 创建文件夹回调 */
  onCreateFolder?: (parentId: string | undefined, type: "module" | "folder") => void
  /** 搜索框文字变更 */
  onSearch?: (query: string) => void
  /** 收起面板回调 */
  onCollapse?: () => void
  /** 自定义类名 */
  class?: string
}

/**
 * EndpointTree 接口树形面板
 */
export function EndpointTree(props: EndpointTreeProps) {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [expandedIds, setExpandedIds] = createSignal<Set<string>>(new Set())

  // 当树数据加载时，自动展开第一个模块节点
  createEffect(() => {
    const data = props.data
    if (data.length > 0) {
      const firstModule = data[0]
      if (firstModule.type === "module") {
        setExpandedIds(prev => {
          if (prev.has(firstModule.id)) return prev
          const next = new Set(prev)
          next.add(firstModule.id)
          return next
        })
      }
    }
  })

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
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
  const effectiveExpandedIds = () => {
    const query = searchQuery()
    if (!query) return expandedIds()
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
        <Button variant="ghost" size="icon-sm" onClick={() => props.onCreateEndpoint?.(undefined, "module")}>
          <Plus class="h-3.5 w-3.5" />
        </Button>
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
}) {
  const isExpanded = () => props.expandedIds.has(props.node.id)
  const isSelected = () => props.selectedId === props.node.id
  const hasChildren = () => (props.node.children?.length || 0) > 0

  return (
    <ContextMenu items={createMenuItems(props.node, props.onCreateEndpoint, props.onCreateFolder)}>
      <div>
        {/* 节点行 */}
        <div
          class={cn(
            "flex items-center gap-1 py-1 pr-2 cursor-pointer transition-colors text-sm",
            isSelected() ? "bg-accent-muted text-accent" : "hover:bg-muted text-foreground",
          )}
          style={{ "padding-left": `${props.level * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren()) {
              props.onToggle(props.node.id)
            }
            if (props.node.type === "endpoint") {
              props.onSelect?.(props.node)
            }
          }}
        >
          {/* 展开/折叠图标 */}
          <Show when={hasChildren()}>
            <span class="shrink-0">
              {isExpanded()
                ? <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />}
            </span>
          </Show>
          <Show when={!hasChildren()}>
            <span class="w-3.5 shrink-0" />
          </Show>

          {/* 图标 */}
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
                onCreateEndpoint={props.onCreateEndpoint}
                onCreateFolder={props.onCreateFolder}
              />
            )}
          </For>
        </Show>
      </div>
    </ContextMenu>
  )
}
