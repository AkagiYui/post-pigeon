// 外部链接组件 - 用于在 Wails 应用中打开外部浏览器
import { Browser } from "@wailsio/runtime"
import { ExternalLink as ExternalLinkIcon } from "lucide-solid"
import type { Component } from "solid-js"

interface ExternalLinkProps {
  /** 链接地址 */
  href: string
  /** 显示文本，默认为 href */
  text?: string
  /** 是否显示外链图标 */
  showIcon?: boolean
  /** 自定义图标组件 */
  icon?: Component<{ class?: string }>
  /** 自定义类名 */
  class?: string
}

/**
 * ExternalLink 外部链接组件
 * 使用 Wails runtime 在系统浏览器中打开外部链接
 */
export function ExternalLink(props: ExternalLinkProps) {
  const handleClick = () => {
    Browser.OpenURL(props.href)
  }

  // 使用自定义图标或默认外链图标
  const IconComponent = props.icon ?? ExternalLinkIcon

  return (
    <button
      type="button"
      onClick={handleClick}
      class={props.class ?? "flex items-center gap-1 text-sm text-accent hover:underline"}
    >
      {props.text ?? props.href}
      {props.showIcon !== false && <IconComponent class="h-3 w-3" />}
    </button>
  )
}
