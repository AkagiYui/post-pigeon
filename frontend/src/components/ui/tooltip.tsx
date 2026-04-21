// Tooltip 提示组件
import { type JSX, splitProps, Show, createSignal, createEffect } from 'solid-js'
import { cn } from '@/lib/utils'

export interface TooltipProps {
    /** 提示内容 */
    content: string
    /** 子元素 */
    children: JSX.Element
    /** 延迟显示时间（毫秒） */
    delay?: number
    /** 位置（不设置则自动选择） */
    placement?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Tooltip 提示组件
 * 支持自动定位，根据视口边界选择最佳弹出位置
 */
export function Tooltip(props: TooltipProps) {
    const [local] = splitProps(props, ['content', 'children', 'delay', 'placement'])
    const [visible, setVisible] = createSignal(false)
    let triggerRef: HTMLDivElement | undefined
    const [autoPlacement, setAutoPlacement] = createSignal<'top' | 'bottom' | 'left' | 'right'>('top')
    let timer: ReturnType<typeof setTimeout>

    // 计算最佳弹出位置
    const calculatePlacement = (): 'top' | 'bottom' | 'left' | 'right' => {
        // 如果用户指定了位置，优先使用
        if (local.placement) return local.placement

        if (!triggerRef) return 'top'

        const rect = triggerRef.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // 计算各方向的可用空间
        const spaceTop = rect.top
        const spaceBottom = viewportHeight - rect.bottom
        const spaceLeft = rect.left
        const spaceRight = viewportWidth - rect.right

        // Tooltip 通常较小，估算尺寸
        const tooltipWidth = 80
        const tooltipHeight = 30

        // 计算各方向的得分（空间越大得分越高，空间不足则为负分）
        const scores = {
            top: spaceTop >= tooltipHeight ? spaceTop : -1000,
            bottom: spaceBottom >= tooltipHeight ? spaceBottom : -1000,
            right: spaceRight >= tooltipWidth ? spaceRight : -1000,
            left: spaceLeft >= tooltipWidth ? spaceLeft : -1000,
        }

        // 选择得分最高的方向
        const best = Object.entries(scores).reduce((a, b) =>
            b[1] > a[1] ? b : a
        )[0] as 'top' | 'bottom' | 'left' | 'right'

        return best
    }

    const placementClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    }

    // 使用用户指定的位置或自动计算的位置
    const currentPlacement = () => local.placement || autoPlacement()

    return (
        <div
            class="relative inline-flex"
            ref={triggerRef}
            onMouseEnter={() => {
                timer = setTimeout(() => {
                    setAutoPlacement(calculatePlacement())
                    setVisible(true)
                }, local.delay || 300)
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
                        placementClasses[currentPlacement()]
                    )}
                >
                    {local.content}
                </div>
            </Show>
        </div>
    )
}
