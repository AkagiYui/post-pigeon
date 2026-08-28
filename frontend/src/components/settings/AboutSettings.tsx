// 关于页面组件
import { createSignal, onMount, Show } from "solid-js"

import { AppInfo, AppService } from "@/bindings/PostPigeon/internal/services"
import { ExternalLink } from "@/components/ui/external-link"
import { t } from "@/hooks/useI18n"
import { copyText } from "@/lib/clipboard"
import { formatBuildTime } from "@/lib/format"
import { currentUserAgent, engineVersionFromUserAgent } from "@/lib/webview"
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

  // UA 在整个组件生命周期内不会变，取一次就够
  const userAgent = currentUserAgent()

  // 内核名称 + 版本。Go 侧只有 Windows 读得到运行时版本，其余平台用 UA 兜底；
  // 两个都没有就只显示名称，不要显示一个孤零零的「未知」。
  const webviewEngine = () => {
    const info = appInfo()?.webview
    if (!info?.engine) return t("common.unknown")
    const version = info.version || engineVersionFromUserAgent(userAgent)
    return version ? `${info.engine} ${version}` : info.engine
  }

  // 内核来源。这是排查「精简版系统上白屏」时第一件要确认的事：用户手上跑的到底是
  // 内置内核版还是常规版，从任务管理器里看不出来（都只有一个 msedgewebview2.exe）。
  const webviewSource = () => {
    switch (appInfo()?.webview?.source) {
      case "bundled":
        return t("settings.about.webview.source.bundled")
      case "system":
        return t("settings.about.webview.source.system")
      default:
        return t("common.unknown")
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

      {/* 浏览器内核。用户报「白屏 / 渲染不对」时，先问这一栏比问什么都有用 */}
      <div class="text-sm font-medium text-foreground">{t("settings.about.webview")}</div>
      <InfoRow label={t("settings.about.webview.engine")} value={webviewEngine()} />
      <InfoRow label={t("settings.about.webview.source")} value={webviewSource()} />
      {/* 只有内置内核才有目录可显示；走系统内核时这一行没有意义 */}
      <Show when={appInfo()?.webview?.path}>
        {(path) => (
          <div class="flex items-center justify-between gap-4">
            <span class="shrink-0 text-sm text-muted-foreground">{t("settings.about.webview.path")}</span>
            <CopyableText text={path()} />
          </div>
        )}
      </Show>
      <div class="flex items-center justify-between gap-4">
        <span class="shrink-0 text-sm text-muted-foreground">{t("settings.about.webview.userAgent")}</span>
        <CopyableText text={userAgent} />
      </div>

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
      await copyText(props.hash)
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

/**
 * 可复制的长文本。
 *
 * 内核目录和 UA 都长到没法完整展示，但用户报问题时恰恰要把原文贴出来——
 * 截断显示 + 点击复制完整内容，比让他手动去别处找强。
 */
function CopyableText(props: { text: string }) {
  const [copied, setCopied] = createSignal(false)

  const handleCopy = async () => {
    try {
      await copyText(props.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toastError(error, "error.op.copyFailed")
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      class="min-w-0 text-right text-sm text-foreground font-mono truncate cursor-pointer
             border-b border-dotted border-muted-foreground/50
             hover:border-foreground hover:text-accent
             transition-colors duration-150"
      title={copied() ? t("common.copied") : props.text}
    >
      {copied() ? t("common.copied") : props.text}
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
