// 关于页面组件
import { createSignal, onMount } from "solid-js"

import { AppInfo, AppService } from "@/bindings/PostPigeon/internal/services"
import { ExternalLink } from "@/components/ui/external-link"
import { t } from "@/hooks/useI18n"
import { formatBuildTime } from "@/lib/format"
import { toastError } from "@/stores/toast"

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
      toastError(error, "error.op.loadFailed")
    }
  })

  // 构建时间转本地时区展示，带上时区标识；解析不了就原样显示
  const buildTime = () => {
    const raw = appInfo()?.buildTime
    if (!raw) return t("common.unknown")
    return formatBuildTime(raw) ?? raw
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
          <p class="text-sm text-muted-foreground">{t("settings.about.description")}</p>
        </div>
      </div>

      {/* 版本信息 */}
      <InfoRow label={t("settings.about.version")} value={appInfo()?.version ?? t("common.unknown")} />
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">{t("settings.about.buildHash")}</span>
        <BuildHashValue hash={appInfo()?.buildHash ?? t("common.unknown")} />
      </div>
      <InfoRow label={t("settings.about.buildTime")} value={buildTime()} />

      <div class="border-t border-border my-4" />

      {/* 历史版本：用户在版本之间来回跳是常态，退回旧版本不该让他自己去翻仓库 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.releases")}</span>
        <ExternalLink href={appInfo()?.releasesUrl ?? ""} text={t("settings.about.releases.link")} />
      </div>
      <p class="-mt-2 text-xs text-muted-foreground">{t("settings.about.releases.hint")}</p>

      {/* 源码仓库 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.repository")}</span>
        <ExternalLink href={appInfo()?.repositoryUrl ?? ""} text="GitHub" />
      </div>

      {/* 个人主页 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.homepage")}</span>
        <ExternalLink href="https://aky.moe" text="aky.moe" />
      </div>

      {/* 联系作者 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.contact")}</span>
        <ExternalLink href="mailto:akagiyui@yeah.net" text="akagiyui@yeah.net" icon="lucide:mail" />
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
      toastError(error, "error.op.copyFailed")
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
