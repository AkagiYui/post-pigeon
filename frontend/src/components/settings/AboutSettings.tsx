// 关于页面组件
import { ExternalLink, Mail } from "lucide-solid"

import { t } from "@/hooks/useI18n"

/**
 * AboutSettings 关于页面
 */
export function AboutSettings() {
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
      <InfoRow label={t("settings.about.version")} value="0.0.1" />
      <InfoRow label={t("settings.about.buildHash")} value="dev" />

      <div class="border-t border-border my-4" />

      {/* 个人主页 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.homepage")}</span>
        <a
          href="https://aky.moe"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-sm text-accent hover:underline"
        >
          aky.moe
          <ExternalLink class="h-3 w-3" />
        </a>
      </div>

      {/* 联系作者 */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-foreground">{t("settings.about.contact")}</span>
        <a
          href="mailto:akagiyui@yeah.net"
          class="flex items-center gap-1 text-sm text-accent hover:underline"
        >
          akagiyui@yeah.net
          <Mail class="h-3 w-3" />
        </a>
      </div>
    </div>
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
