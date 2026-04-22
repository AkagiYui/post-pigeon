// Input 输入框基础组件
import { type JSX, splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    /** 输入框尺寸 */
    size?: 'sm' | 'default' | 'lg'
    /** 是否有错误状态 */
    error?: boolean
}

/** 输入框尺寸样式映射 */
const sizeClasses = {
    sm: 'h-7 text-xs px-2',
    default: 'h-8 text-sm px-3',
    lg: 'h-10 text-base px-4',
}

/**
 * Input 输入框组件
 */
export function Input(props: InputProps) {
    const [local, rest] = splitProps(props, ['class', 'size', 'error'])

    return (
        <input
            class={cn(
                'w-full rounded-md border bg-input text-foreground placeholder:text-muted-foreground',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                sizeClasses[local.size || 'default'],
                local.error ? 'border-red-500' : 'border-border',
                local.class
            )}
            {...rest}
        />
    )
}

/**
 * Textarea 多行文本输入组件
 */
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean
}

export function Textarea(props: TextareaProps) {
    const [local, rest] = splitProps(props, ['class', 'error'])

    return (
        <textarea
            class={cn(
                'w-full rounded-md border bg-input text-foreground placeholder:text-muted-foreground',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50 min-h-20 px-3 py-2 text-sm',
                local.error ? 'border-red-500' : 'border-border',
                local.class
            )}
            {...rest}
        />
    )
}
