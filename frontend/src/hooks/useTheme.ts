// 主题管理 Hook
// 管理深色/浅色模式、主题色和缩放比例
import { createEffect, createSignal, onMount } from "solid-js"

import { SettingsService } from "@/../bindings/post-pigeon/internal/services"
import { ACCENT_COLORS, type ThemeAccent, type ThemeMode } from "@/lib/types"

/** 当前主题模式 */
const [themeMode, setThemeMode] = createSignal<ThemeMode>("system")
/** 当前主题色 */
const [themeAccent, setThemeAccent] = createSignal<ThemeAccent>("teal")
/** 界面缩放比例 */
const [uiScale, setUiScale] = createSignal(1.0)

export { themeMode, setThemeMode, themeAccent, setThemeAccent, uiScale, setUiScale }

/** 获取系统颜色模式偏好 */
function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/** 解析实际使用的颜色模式 */
export function resolvedThemeMode(): "light" | "dark" {
  return themeMode() === "system" ? getSystemTheme() : themeMode() as "light" | "dark"
}

/** 应用主题色到 CSS 变量 */
function applyAccentColor(accent: ThemeAccent) {
  const colors = ACCENT_COLORS[accent]
  if (!colors) return
  const root = document.documentElement
  root.style.setProperty("--accent", colors.primary)
  root.style.setProperty("--accent-hover", colors.hover)
  root.style.setProperty("--accent-muted", colors.muted)
}

/** 应用颜色模式到 HTML 元素 */
function applyColorMode(mode: "light" | "dark") {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(mode)
}

/** 应用缩放比例 */
function applyScale(scale: number) {
  document.documentElement.style.fontSize = `${scale * 16}px`
}

/** 初始化主题系统 */
export async function initTheme() {
  try {
    // 从后端加载设置
    const settings = await SettingsService.GetAllSettings()

    if (settings) {
      const mode = (settings["theme.mode"] || "system") as ThemeMode
      const accent = (settings["theme.accent"] || "teal") as ThemeAccent
      const scale = parseFloat(settings["ui.scale"] || "1.0")

      setThemeMode(mode)
      setThemeAccent(accent)
      setUiScale(scale)
    }
  } catch (e) {
    console.warn("加载主题设置失败，使用默认值", e)
  }

  // 应用主题
  applyColorMode(resolvedThemeMode())
  applyAccentColor(themeAccent())
  applyScale(uiScale())

  // 监听系统颜色模式变化
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaQuery.addEventListener("change", () => {
    if (themeMode() === "system") {
      applyColorMode(getSystemTheme())
    }
  })
}

/** 切换主题模式 */
export async function changeThemeMode(mode: ThemeMode) {
  setThemeMode(mode)
  applyColorMode(resolvedThemeMode())
  try {
    await SettingsService.SetSetting("theme.mode", mode)
  } catch (e) {
    console.warn("保存主题模式失败", e)
  }
}

/** 切换主题色 */
export async function changeThemeAccent(accent: ThemeAccent) {
  setThemeAccent(accent)
  applyAccentColor(accent)
  try {
    await SettingsService.SetSetting("theme.accent", accent)
  } catch (e) {
    console.warn("保存主题色失败", e)
  }
}

/** 切换缩放比例 */
export async function changeUIScale(scale: number) {
  setUiScale(scale)
  applyScale(scale)
  try {
    await SettingsService.SetSetting("ui.scale", scale.toString())
  } catch (e) {
    console.warn("保存缩放比例失败", e)
  }
}
