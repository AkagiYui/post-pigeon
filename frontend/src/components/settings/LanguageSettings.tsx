// 语言设置组件
import { Select } from "@/components/ui/select"
import { changeLanguage, t, userLanguageChoice } from "@/hooks/useI18n"

/** 语言选项 */
const languageOptions = [
  { value: "system", label: t("settings.language.system") },
  { value: "zh-CN", label: t("settings.language.zhCN") },
  { value: "en", label: t("settings.language.en") },
]

/**
 * LanguageSettings 语言设置
 */
export function LanguageSettings() {
  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <label class="text-sm text-foreground">{t("settings.language")}</label>
        <Select
          options={languageOptions}
          value={userLanguageChoice()}
          onChange={(v) => changeLanguage(v as "zh-CN" | "en" | "system")}
          class="w-52"
        />
      </div>
    </div>
  )
}
