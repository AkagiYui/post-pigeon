// Table 表格组件
import { createRenderEffect, For, type JSX, Show, splitProps } from "solid-js"
import { createStore, reconcile } from "solid-js/store"

import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

export interface TableColumn<T> {
  /** 列标题 */
  header: JSX.Element
  /** 列宽 */
  width?: string
  /** 自定义渲染 */
  render?: (row: T, index: number) => JSX.Element
  /** 数据字段名（如果不用 render） */
  field?: keyof T & string
}

export interface TableProps<T> {
  /** 列定义 */
  columns: TableColumn<T>[]
  /** 数据行 */
  data: T[]
  /** 行点击回调 */
  onRowClick?: (row: T, index: number) => void
  /** 空数据提示 */
  emptyText?: string
  /** 自定义类名 */
  class?: string
  /** 每行的额外类名（如 group，用于行 hover 时显隐行内按钮） */
  rowClass?: string | ((row: T, index: number) => string | undefined)
  /** 紧凑模式 */
  compact?: boolean
}

/**
 * Table 表格组件
 *
 * 关键点：把每次传入的 `data`（上层多为「不可变更新」——编辑一行即生成新数组、新行对象）
 * 通过 reconcile 合并进内部稳定 store，使相同 id 的行对象引用在编辑间保持稳定。
 * 否则 `<For>`（按引用比较）会因行对象引用变化而重建整行 DOM——重建会让正在输入的
 * 输入框丢失焦点（WKWebView 下尤为明显，表现为「输入一个字符后需重新点击」）。
 * 行带 id 时按 id 归并（新增/删除/重排仍正确）；无 id 的只读表回退为结构/索引归并。
 */
export function Table<T extends object>(props: TableProps<T>) {
  const [local] = splitProps(props, ["columns", "data", "onRowClick", "emptyText", "class", "rowClass", "compact"])

  const [state, setState] = createStore<{ rows: T[] }>({ rows: [] })
  createRenderEffect(() => {
    const data = local.data ?? []
    const first = data[0] as Record<string, unknown> | undefined
    const key = first && typeof first === "object" && "id" in first ? "id" : null
    setState("rows", reconcile(data, { key, merge: true }))
  })

  return (
    <div class={cn("overflow-auto", local.class)}>
      <table class="w-full text-sm">
        <thead>
          {/* Apifox 无边框表头：前景色、半粗、无底色，仅一条浅分隔线 */}
          <tr class="border-b border-divider">
            <For each={local.columns}>
              {(col) => (
                <th
                  scope="col"
                  class={cn(
                    "text-left font-bold text-foreground whitespace-nowrap",
                    local.compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <Show
            when={state.rows.length > 0}
            fallback={
              <tr>
                <td
                  colSpan={local.columns.length}
                  class={cn(
                    "text-center text-muted-foreground",
                    local.compact ? "py-4" : "py-8",
                  )}
                >
                  {local.emptyText || t("common.noData")}
                </td>
              </tr>
            }
          >
            <For each={state.rows}>
              {(row, index) => (
                <tr
                  class={cn(
                    "border-b border-divider transition-colors hover:bg-hover-subtle",
                    local.onRowClick && "cursor-pointer focus-visible:outline-none focus-visible:bg-hover",
                    typeof local.rowClass === "function" ? local.rowClass(row, index()) : local.rowClass,
                  )}
                  // 可点击的行必须能用键盘触达并激活，否则只有鼠标用户能用
                  role={local.onRowClick ? "button" : undefined}
                  tabIndex={local.onRowClick ? 0 : undefined}
                  onClick={() => local.onRowClick?.(row, index())}
                  onKeyDown={(e) => {
                    if (!local.onRowClick) return
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      local.onRowClick(row, index())
                    }
                  }}
                >
                  <For each={local.columns}>
                    {(col) => (
                      <td class={local.compact ? "px-2 py-1.5" : "px-3 py-2"}>
                        {col.render
                          ? col.render(row, index())
                          : String(row[col.field!] ?? "")}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  )
}
