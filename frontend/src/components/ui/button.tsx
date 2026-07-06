// Button 基础组件，原生 <button> + cva 变体
// （Ark UI 不提供 Button 原语——它专注于有状态的复合组件——原生按钮本身即具备完整无障碍语义）
import { cva, type VariantProps } from "class-variance-authority"
import { type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

/** 按钮变体定义 */
const buttonVariants = cva(
  // 字重 400（不加粗）、无阴影、8px 圆角（rounded-md 已映射为 8px）
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        // 主按钮：紫色填充、白字、扁平无阴影
        default: "bg-accent text-white hover:bg-accent-hover",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        // 普通按钮：白底、灰边、灰字，hover 变浅灰底
        outline: "border border-border bg-surface text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // 文字/图标按钮：hover 浅紫底 + 紫字
        ghost: "hover:bg-accent-muted hover:text-accent",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-10 px-4 text-base",
        icon: "h-8 w-8",
        "icon-sm": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

/**
 * Button 按钮组件
 *
 * @example
 * ```tsx
 * <Button variant="default">确定</Button>
 * <Button variant="ghost" size="icon"><Icon /></Button>
 * ```
 */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["class", "variant", "size", "children"])

  return (
    <button
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      {...rest}
    >
      {local.children}
    </button>
  )
}
