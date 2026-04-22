// Badge 标签组件，用于 HTTP 方法、状态码等标记
import { cva, type VariantProps } from "class-variance-authority"
import { type JSX, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-accent-muted text-accent",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        get: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        post: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        put: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        patch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type BadgeProps = JSX.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

/**
 * Badge 标签组件
 *
 * @example
 * ```tsx
 * <Badge variant="get">GET</Badge>
 * <Badge variant="success">200 OK</Badge>
 * ```
 */
export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ["class", "variant", "children"])

  return (
    <span
      class={cn(badgeVariants({ variant: local.variant }), local.class)}
      {...rest}
    >
      {local.children}
    </span>
  )
}
