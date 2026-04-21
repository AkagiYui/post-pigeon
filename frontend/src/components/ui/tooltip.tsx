// Tooltip 提示组件
import { type JSX, splitProps, Show, createSignal } from 'solid-js'
import { cn } from '@/lib/utils'

export interface TooltipProps {
    /** 提示内容 */
    content: string
    /** 子元素 */
    children: JSX.Element
    /** 延迟显示时间（毫秒） */
    delay?: number
    /** 位置 */
    placement?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Tooltip 提示组件
 */
export function Tooltip(props: TooltipProps) {
    const [local] = splitProps(props, ['content', 'children', 'delay', 'placement'])
    const [visible, setVisible] = createSignal(false)
    let timer: ReturnType<typeof setTimeout>

    const placementClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    }

    return (
        <div
            class="relative inline-flex"
            onMouseEnter={() => {
                timer = setTimeout(() => setVisible(true), local.delay || 300)
            }}
            onMouseLeave={() => {
                clearTimeout(timer)
                setVisible(false)
            }}
        >
            {local.children}
            <Show when={visible()}>
                <div
                    class={cn(
                        'absolute z-50 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground shadow-md border border-border whitespace-nowrap pointer-events-none',
                        placementClasses[local.placement || 'top']
                    )}
                >
                    {local.content}
                </div>
            </Show>
        </div>
    )
}
