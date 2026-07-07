// 方法徽章：接口树与接口 Tab 栏共用，仅用文字颜色区分 HTTP 方法（无底色），字体加粗
import { type HTTPMethod, METHOD_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface MethodBadgeProps {
  /** HTTP 方法（大小写不敏感，最多显示 4 个字符） */
  method?: HTTPMethod | string
  /** 追加类名（如接口树列对齐用的固定宽度 w-9） */
  class?: string
}

/**
 * MethodBadge 方法徽章
 * 无底色、等宽字体、加粗、大写；颜色按方法映射，未知方法回退灰色。
 */
export function MethodBadge(props: MethodBadgeProps) {
  const method = () => props.method || ""
  return (
    <span
      class={cn(
        "shrink-0 text-[10px] font-mono font-bold uppercase leading-none tracking-tight",
        METHOD_COLORS[method()] || "text-gray-500 dark:text-gray-400",
        props.class,
      )}
      title={method()}
    >
      {method().slice(0, 4)}
    </span>
  )
}
