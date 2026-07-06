// 外观设置组件
import { Select } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { t } from "@/hooks/useI18n"
import { changeThemeAccent, changeThemeMode, changeUIScale, themeAccent, themeMode, UI_SCALE_CONFIG, uiScale } from "@/hooks/useTheme"
import { ACCENT_COLORS, type ThemeAccent, type ThemeMode } from "@/lib/types"

/**
 * AppearanceSettings 外观设置
 */
export function AppearanceSettings() {
  // 主题模式选项（放在组件内确保 t() 响应语言切换）
  const modeOptions = () => [
    { value: "system" as const, label: t("settings.theme.system") },
    { value: "light" as const, label: t("settings.theme.light") },
    { value: "dark" as const, label: t("settings.theme.dark") },
  ]

  // 主题色选项（放在组件内确保 t() 响应语言切换）
  const accentOptions = () => [
    { value: "purple" as const, label: t("settings.theme.purple") },
    { value: "blue" as const, label: t("settings.theme.blue") },
    { value: "blue2" as const, label: t("settings.theme.blue2") },
    { value: "cerulean" as const, label: t("settings.theme.cerulean") },
    { value: "gold" as const, label: t("settings.theme.gold") },
    { value: "green" as const, label: t("settings.theme.green") },
    { value: "orange" as const, label: t("settings.theme.orange") },
    { value: "pink" as const, label: t("settings.theme.pink") },
    { value: "red" as const, label: t("settings.theme.red") },
    { value: "silver" as const, label: t("settings.theme.silver") },
  ]

  return (
    <div class="space-y-6">
      {/* 主题模式 */}
      <SettingItem label={t("settings.theme.mode")}>
        <Select
          options={modeOptions()}
          value={themeMode()}
          onChange={(v) => changeThemeMode(v as ThemeMode)}
          class="w-32"
        />
      </SettingItem>

      {/* 主题色 */}
      <SettingItem label={t("settings.theme.accent")}>
        <div class="flex flex-wrap justify-end gap-2 max-w-[280px]">
          {accentOptions().map(opt => (
            <button
              class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
              style={{
                "background-color": ACCENT_COLORS[opt.value].primary,
                "border-color": themeAccent() === opt.value ? "var(--foreground)" : "transparent",
              }}
              onClick={() => changeThemeAccent(opt.value as ThemeAccent)}
              title={opt.label}
            />
          ))}
        </div>
      </SettingItem>

      {/* 界面缩放 */}
      <SettingItem label={t("settings.ui.scale")}>
        <Slider
          value={uiScale()}
          min={UI_SCALE_CONFIG.MIN}
          max={UI_SCALE_CONFIG.MAX}
          step={UI_SCALE_CONFIG.STEP}
          onChange={changeUIScale}
          marks={UI_SCALE_CONFIG.MARKS}
          class="w-64"
        />
      </SettingItem>
    </div>
  )
}

/** 设置项布局 */
function SettingItem(props: { label: string; children: any }) {
  return (
    <div class="flex items-center justify-between">
      <label class="text-sm text-foreground">{props.label}</label>
      <div>{props.children}</div>
    </div>
  )
}
