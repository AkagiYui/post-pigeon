// 文件夹树形选择器组件
// 用于保存接口时选择目标模块或文件夹，仅展示模块和文件夹节点
import { Folder, FolderOpen, Package, PackageOpen } from "lucide-solid"
import { createSignal, For, Show } from "solid-js"

import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

import type { TreeNode } from "./EndpointTree"

export interface FolderTreeSelectorProps {
  /** 树数据（完整的项目树，内部会过滤掉 endpoint 节点） */
  data: TreeNode[]
  /** 当前选中的节点 ID */
  selectedId?: string
  /** 选中回调，返回被选中的节点 */
  onSelect?: (node: TreeNode) => void
  /** 外部控制的展开节点 ID 集合 */
  expandedIds?: Set<string>
  /** 展开状态变化回调 */
  onExpandedChange?: (ids: Set<string>) => void
  /** 自定义类名 */
  class?: string
}

/**
 * FolderTreeSelector 文件夹树形选择器
 * 仅展示模块和文件夹，用于保存接口时选择目标位置
 */
export function FolderTreeSelector(props: FolderTreeSelectorProps) {
  // 展开状态：优先使用外部 prop，否则使用内部状态
  const [internalExpandedIds, setInternalExpandedIds] = createSignal<Set<string>>(new Set())

  const getExpandedIds = () => props.expandedIds ?? internalExpandedIds()

  const setExpandedIds = (fn: (prev: Set<string>) => Set<string>) => {
    if (props.onExpandedChange) {
      props.onExpandedChange(fn(props.expandedIds ?? new Set()))
    } else {
      setInternalExpandedIds(fn)
    }
  }

  // 过滤出仅包含模块和文件夹的节点（去除 endpoint）
  const folderOnlyData = (): TreeNode[] => filterFoldersOnly(props.data)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div
      class={cn(
        "border border-border rounded-md bg-input overflow-auto",
        props.class,
      )}
    >
      <Show
        when={folderOnlyData().length > 0}
        fallback={
          <div class="p-3 text-sm text-muted-foreground text-center">
            {t("endpoint.noModuleOrFolder")}
          </div>
        }
      >
        <For each={folderOnlyData()}>
          {(node) => (
            <FolderTreeNodeItem
              node={node}
              level={0}
              selectedId={props.selectedId}
              expandedIds={getExpandedIds()}
              onSelect={props.onSelect}
              onToggle={toggleExpand}
            />
          )}
        </For>
      </Show>
    </div>
  )
}

/** 过滤树节点，仅保留模块和文件夹 */
function filterFoldersOnly(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .filter((n) => n.type !== "endpoint")
    .map((n) => ({
      ...n,
      children: n.children ? filterFoldersOnly(n.children) : undefined,
    }))
}

/** 文件夹选择器中的树节点项 */
function FolderTreeNodeItem(props: {
  node: TreeNode
  level: number
  selectedId?: string
  expandedIds: Set<string>
  onSelect?: (node: TreeNode) => void
  onToggle: (id: string) => void
}) {
  const isExpanded = () => props.expandedIds.has(props.node.id)
  const isSelected = () => props.selectedId === props.node.id
  const hasChildren = () => (props.node.children?.length || 0) > 0

  return (
    <div>
      {/* 节点行 */}
      <div
        class={cn(
          "flex items-center gap-1.5 py-1.5 pr-2 cursor-pointer transition-colors text-sm",
          isSelected()
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted text-foreground",
        )}
        style={{ "padding-left": `${props.level * 16 + 8}px` }}
        onClick={() => {
          // 模块和文件夹都能被选中作为保存位置
          if (hasChildren()) {
            props.onToggle(props.node.id)
          }
          props.onSelect?.(props.node)
        }}
      >
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

        {/* 名称 */}
        <span class="truncate flex-1">{props.node.name}</span>
      </div>

      {/* 子节点 */}
      <Show when={hasChildren() && isExpanded()}>
        <For each={props.node.children}>
          {(child) => (
            <FolderTreeNodeItem
              node={child}
              level={props.level + 1}
              selectedId={props.selectedId}
              expandedIds={props.expandedIds}
              onSelect={props.onSelect}
              onToggle={props.onToggle}
            />
          )}
        </For>
      </Show>
    </div>
  )
}
