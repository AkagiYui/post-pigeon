// Popover 气泡弹出组件
import { type JSX, splitProps, Show, createSignal } from 'solid-js'
import { cn } from '@/lib/utils'

export interface PopoverProps {
    /** 触发元素 */
    trigger: JSX.Element
    /** 弹出内容 */
    children: JSX.Element
    /** 弹出位置 */
    placement?: 'top' | 'bottom' | 'left' | 'right'
    /** 自定义类名 */
    class?: string
    /** 是否显示 */
    open?: boolean
    /** 显示变更回调 */
    onOpenChange?: (open: boolean) => void
}

/**
 * Popover 气泡弹出组件
 */
export function Popover(props: PopoverProps) {
    const [internalOpen, setInternalOpen] = createSignal(false)
    const isOpen = () => props.open !== undefined ? props.open : internalOpen()

    const setOpen = (val: boolean) => {
        setInternalOpen(val)
        props.onOpenChange?.(val)
    }

    const placementClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    }

    return (
        <div class="relative inline-flex">
            <div onClick={() => setOpen(!isOpen())}>
                {props.trigger}
            </div>
            <Show when={isOpen()}>
                <>
                    {/* 透明遮罩，点击关闭 */}
                    <div
                        class="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />
                    <div
                        class={cn(
                            'absolute z-50 bg-surface rounded-lg shadow-lg border border-border p-3 min-w-[120px]',
                            placementClasses[props.placement || 'bottom'],
                            props.class
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {props.children}
                    </div>
                </>
            </Show>
        </div>
    )
}
