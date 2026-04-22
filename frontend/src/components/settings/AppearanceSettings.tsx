// 外观设置组件
import { createSignal, onMount } from "solid-js"

import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { changeThemeAccent, changeThemeMode, changeUIScale, themeAccent, themeMode, uiScale } from "@/hooks/useTheme"
import { type ThemeAccent, type ThemeMode } from "@/lib/types"

/** 主题模式选项 */
const modeOptions = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
]

/** 主题色选项 */
const accentOptions = [
  { value: "teal", label: "青色" },
  { value: "blue", label: "蓝色" },
  { value: "violet", label: "紫色" },
  { value: "rose", label: "玫瑰色" },
  { value: "orange", label: "橙色" },
]

/** 缩放选项 */
const scaleOptions = [
  { value: "0.8", label: "80%" },
  { value: "0.9", label: "90%" },
  { value: "1.0", label: "100%" },
  { value: "1.1", label: "110%" },
  { value: "1.25", label: "125%" },
  { value: "1.5", label: "150%" },
]

/**
 * AppearanceSettings 外观设置
 */
export function AppearanceSettings() {
  return (
    <div class="space-y-6">
      {/* 主题模式 */}
      <SettingItem label={t("settings.theme.mode")}>
        <Select
          options={modeOptions}
          value={themeMode()}
          onChange={(v) => changeThemeMode(v as ThemeMode)}
          class="w-32"
        />
      </SettingItem>

      {/* 主题色 */}
      <SettingItem label={t("settings.theme.accent")}>
        <div class="flex gap-2">
          {accentOptions.map(opt => (
            <button
              class="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
              style={{
                "background-color": opt.value === "teal" ? "#0ea5a4"
                  : opt.value === "blue" ? "#3b82f6"
                    : opt.value === "violet" ? "#8b5cf6"
                      : opt.value === "rose" ? "#f43f5e"
                        : "#f97316",
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
        <Select
          options={scaleOptions}
          value={uiScale().toString()}
          onChange={(v) => changeUIScale(parseFloat(v))}
          class="w-32"
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
