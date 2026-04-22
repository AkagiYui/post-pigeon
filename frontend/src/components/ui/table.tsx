// Table 表格组件
import { type JSX, For, splitProps, Show } from 'solid-js'
import { cn } from '@/lib/utils'

export interface TableColumn<T> {
    /** 列标题 */
    header: string
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
    /** 紧凑模式 */
    compact?: boolean
}

/**
 * Table 表格组件
 */
export function Table<T extends object>(props: TableProps<T>) {
    const [local] = splitProps(props, ['columns', 'data', 'onRowClick', 'emptyText', 'class', 'compact'])

    return (
        <div class={cn('overflow-auto', local.class)}>
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-border bg-muted/50">
                        <For each={local.columns}>
                            {(col) => (
                                <th
                                    class={cn(
                                        'text-left font-medium text-muted-foreground whitespace-nowrap',
                                        local.compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2'
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
                        when={local.data.length > 0}
                        fallback={
                            <tr>
                                <td
                                    colSpan={local.columns.length}
                                    class={cn(
                                        'text-center text-muted-foreground',
                                        local.compact ? 'py-4' : 'py-8'
                                    )}
                                >
                                    {local.emptyText || '暂无数据'}
                                </td>
                            </tr>
                        }
                    >
                        <For each={local.data}>
                            {(row, index) => (
                                <tr
                                    class={cn(
                                        'border-b border-border transition-colors',
                                        local.onRowClick && 'cursor-pointer hover:bg-muted/30',
                                    )}
                                    onClick={() => local.onRowClick?.(row, index())}
                                >
                                    <For each={local.columns}>
                                        {(col) => (
                                            <td class={local.compact ? 'px-2 py-1.5' : 'px-3 py-2'}>
                                                {col.render
                                                    ? col.render(row, index())
                                                    : String(row[col.field!] ?? '')}
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
