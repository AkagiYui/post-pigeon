// 关于页面组件
import { Mail } from "lucide-solid"
import { createSignal, onMount } from "solid-js"

import { AppInfo, AppService } from "@/bindings/post-pigeon/internal/services"
import { ExternalLink } from "@/components/ui/external-link"
import { t } from "@/hooks/useI18n"

/**
 * AboutSettings 关于页面
 */
export function AboutSettings() {
  const [appInfo, setAppInfo] = createSignal<AppInfo | null>(null)

  onMount(async () => {
    try {
      const info = await AppService.GetAppInfo()
      setAppInfo(info)
    } catch (error) {
      console.error("获取应用信息失败:", error)
    }
  })

  // 格式化构建时间为本地时间字符串
  const formatBuildTime = (timeStr: string) => {
    if (!timeStr) return "dev"
    try {
      const date = new Date(timeStr)
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    } catch {
      return timeStr
    }
  }

  return (
    <div class="space-y-4">
      {/* 应用名称和图标 */}
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
          <span class="text-accent text-xl font-bold">P</span>
        </div>
        <div>
          <h3 class="text-lg font-semibold">{t("app.name")}</h3>
          <p class="text-sm text-muted-foreground">A lightweight API testing tool</p>
        </div>
      </div>

      {/* 版本信息 */}
      <InfoRow label={t("settings.about.version")} value={appInfo()?.version ?? "unknown"} />
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">{t("settings.about.buildHash")}</span>
        <BuildHashValue hash={appInfo()?.buildHash ?? "unknown"} />
      </div>
      <InfoRow
        label={t("settings.about.buildTime")}
        value={formatBuildTime(appInfo()?.buildTime ?? "unknown")}
      />

      <div class="border-t border-border my-4" />

      {/* 个人主页 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.homepage")}</span>
        <ExternalLink href="https://aky.moe" text="aky.moe" />
      </div>

      {/* 联系作者 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.contact")}</span>
        <ExternalLink href="mailto:akagiyui@yeah.net" text="akagiyui@yeah.net" icon={Mail} />
      </div>
    </div>
  )
}

/** 构建哈希值组件 - 可点击复制，响应式显示 */
function BuildHashValue(props: { hash: string }) {
  const [copied, setCopied] = createSignal(false)

  // 获取短哈希（前7个字符）
  const shortHash = () => {
    const h = props.hash
    return h.length > 7 ? h.substring(0, 7) : h
  }

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.hash)
      setCopied(true)
      // 2秒后重置状态
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("复制失败:", error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      class="text-sm text-foreground font-mono cursor-pointer
             border-b border-dotted border-muted-foreground/50
             hover:border-foreground hover:text-accent
             transition-colors duration-150
             max-sm:inline-block"
      title={copied() ? t("common.copied") : t("settings.about.clickToCopy")}
    >
      {/* 大屏幕显示完整哈希，小屏幕显示短哈希 */}
      <span class="max-sm:hidden">{props.hash}</span>
      <span class="hidden max-sm:inline">{shortHash()}</span>
      {/* 复制成功提示 */}
      {copied() && (
        <span class="ml-1 text-xs text-accent">{t("common.copied")}</span>
      )}
    </button>
  )
}

/** 信息行 */
function InfoRow(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">{props.label}</span>
      <span class="text-sm text-foreground font-mono">{props.value}</span>
    </div>
  )
}
