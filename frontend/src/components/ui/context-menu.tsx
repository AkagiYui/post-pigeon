// ContextMenu 右键菜单组件，支持多级菜单
import { type JSX, splitProps, For, Show, createSignal } from 'solid-js'
import { cn } from '@/lib/utils'

export interface MenuItem {
    /** 菜单项唯一标识 */
    key: string
    /** 显示文字 */
    label: string
    /** 图标 */
    icon?: JSX.Element
    /** 快捷键提示 */
    accelerator?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 是否为分隔线 */
    separator?: boolean
    /** 子菜单 */
    children?: MenuItem[]
    /** 点击回调 */
    onClick?: () => void
}

export interface ContextMenuProps {
    /** 子元素（触发区域） */
    children: JSX.Element
    /** 菜单项列表 */
    items: MenuItem[]
    /** 自定义类名 */
    class?: string
}

/**
 * ContextMenu 右键菜单组件
 * 支持多级嵌套菜单
 */
export function ContextMenu(props: ContextMenuProps) {
    const [local] = splitProps(props, ['children', 'items', 'class'])
    const [visible, setVisible] = createSignal(false)
    const [position, setPosition] = createSignal({ x: 0, y: 0 })

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault()
        setPosition({ x: e.clientX, y: e.clientY })
        setVisible(true)
    }

    const close = () => setVisible(false)

    return (
        <div
            class={local.class}
            onContextMenu={handleContextMenu}
        >
            {local.children}
            <Show when={visible()}>
                <>
                    <div class="fixed inset-0 z-40" onClick={close} onContextMenu={(e) => { e.preventDefault(); close() }} />
                    <div
                        class="fixed z-50 min-w-[180px] bg-surface border border-border rounded-md shadow-lg py-1"
                        style={{ left: `${position().x}px`, top: `${position().y}px` }}
                    >
                        <MenuItems items={local.items} onClose={close} />
                    </div>
                </>
            </Show>
        </div>
    )
}

/** 菜单项列表渲染 */
function MenuItems(props: { items: MenuItem[]; onClose: () => void }) {
    return (
        <For each={props.items}>
            {(item) => (
                <Show
                    when={!item.separator}
                    fallback={<div class="my-1 border-t border-border" />}
                >
                    <Show
                        when={!item.children?.length}
                        fallback={<SubMenu item={item} onClose={props.onClose} />}
                    >
                        <div
                            class={cn(
                                'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none',
                                item.disabled
                                    ? 'text-muted-foreground cursor-not-allowed'
                                    : 'text-foreground hover:bg-accent-muted hover:text-accent'
                            )}
                            onClick={() => {
                                if (!item.disabled) {
                                    item.onClick?.()
                                    props.onClose()
                                }
                            }}
                        >
                            <Show when={item.icon}>
                                <span class="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
                            </Show>
                            <span class="flex-1">{item.label}</span>
                            <Show when={item.accelerator}>
                                <span class="text-xs text-muted-foreground ml-4">{item.accelerator}</span>
                            </Show>
                        </div>
                    </Show>
                </Show>
            )}
        </For>
    )
}

/** 子菜单渲染 */
function SubMenu(props: { item: MenuItem; onClose: () => void }) {
    const [open, setOpen] = createSignal(false)
    const [pos, setPos] = createSignal({ x: 0, y: 0 })

    return (
        <div
            class="relative"
            onMouseEnter={(e) => {
                setOpen(true)
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setPos({ x: rect.right, y: rect.top })
            }}
            onMouseLeave={() => setOpen(false)}
        >
            <div class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors mx-1 rounded-sm select-none hover:bg-accent-muted hover:text-accent">
                <Show when={props.item.icon}>
                    <span class="w-4 h-4 shrink-0 flex items-center justify-center">{props.item.icon}</span>
                </Show>
                <span class="flex-1">{props.item.label}</span>
                <svg class="h-3.5 w-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>
            <Show when={open()}>
                <div
                    class="fixed z-50 min-w-[180px] bg-surface border border-border rounded-md shadow-lg py-1"
                    style={{ left: `${pos().x}px`, top: `${pos().y}px` }}
                >
                    <MenuItems items={props.item.children || []} onClose={props.onClose} />
                </div>
            </Show>
        </div>
    )
}
