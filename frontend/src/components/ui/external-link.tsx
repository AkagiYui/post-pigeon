// 外部链接组件 - 用于在 Wails 应用中打开外部浏览器
import { Icon } from "@iconify-icon/solid"
import { Browser } from "@wailsio/runtime"

interface ExternalLinkProps {
  /** 链接地址 */
  href: string
  /** 显示文本，默认为 href */
  text?: string
  /** 是否显示外链图标 */
  showIcon?: boolean
  /** 自定义图标名称（Iconify 名称，如 "lucide:mail"），默认为外链图标 */
  icon?: string
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

  return (
    <button
      type="button"
      onClick={handleClick}
      class={props.class ?? "flex items-center gap-1 text-sm text-accent hover:underline"}
    >
      {props.text ?? props.href}
      {props.showIcon !== false && <Icon icon={props.icon ?? "lucide:external-link"} class="h-3 w-3" />}
    </button>
  )
}
