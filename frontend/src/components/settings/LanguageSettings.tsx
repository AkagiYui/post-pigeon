// 语言设置组件
import { Select } from "@/components/ui/select"
import { changeLanguage, t, userLanguageChoice } from "@/hooks/useI18n"

/**
 * LanguageSettings 语言设置
 */
export function LanguageSettings() {
  // 语言选项（放在组件内确保 t() 响应语言切换）
  const languageOptions = () => [
    { value: "system" as const, label: t("settings.language.system") },
    { value: "zh-CN" as const, label: t("settings.language.zhCN") },
    { value: "en" as const, label: t("settings.language.en") },
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <label class="text-sm text-foreground">{t("settings.language")}</label>
        <Select
          options={languageOptions()}
          value={userLanguageChoice()}
          onChange={(v) => changeLanguage(v as "zh-CN" | "en" | "system")}
          class="w-52"
        />
      </div>
    </div>
  )
}
