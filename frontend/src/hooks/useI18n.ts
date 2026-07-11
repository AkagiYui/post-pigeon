// 国际化（i18n）管理
// 基于 @solid-primitives/i18n 的 translator 构建，保留既有的 t(key, params) 调用签名，
// 使所有调用点无需改动即可享受库提供的类型推导与模板解析能力。
import * as i18n from "@solid-primitives/i18n"
import { createSignal } from "solid-js"

import { SettingsService } from "@/../bindings/PostPigeon/internal/services"
import en from "@/i18n/en.json"
import zhCN from "@/i18n/zh-CN.json"
import { type Language } from "@/lib/types"

/** 扁平字典类型：键为点分路径，值为翻译文本 */
type Dict = Record<string, string>

/** 翻译资源映射 */
const dictionaries: Record<Language, Dict> = {
  "zh-CN": zhCN as Dict,
  "en": en as Dict,
}

/** 基准语言：zh-CN 拥有全部键，其它语言缺失翻译时回退到它 */
const BASE_LANGUAGE: Language = "zh-CN"

/** 当前语言 */
const [language, setLanguage] = createSignal<Language>(BASE_LANGUAGE)

/** 用户选择的语言设置（可能为 'system'） */
const [userLanguageChoice, setUserLanguageChoice] = createSignal<Language | "system">("system")

export { language, setLanguage, userLanguageChoice, setUserLanguageChoice }

/**
 * 自定义模板解析：兼容既有的单花括号占位符（如 `{name}`），
 * 全局替换所有出现（旧实现每个键仅替换首次出现），未提供的占位符原样保留。
 * 注意 @solid-primitives/i18n 默认的 resolveTemplate 使用双花括号 `{{ name }}`，
 * 与本项目词条格式不符，故在此覆盖。
 */
const resolveTemplate = (str: string, params: Record<string, string | number> = {}): string =>
  str.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))

/**
 * 各语言「基准语言打底 + 当前语言覆盖」的合并字典缓存，保证所有键都可解析。
 * 按语言惰性构建一次，避免每次 t() 调用都重建 300+ 键的对象。
 */
const mergedCache: Partial<Record<Language, Dict>> = {}

/**
 * 当前语言对应的字典访问器。
 * 直接读取 language() 信号（在 translator 内部、进而在 t() 的响应式作用域中被调用），
 * 因此语言切换时所有 t() 结果自动更新——与旧实现直接读信号的响应式语义一致。
 */
const currentDict = (): Dict => {
  const lang = language()
  return (mergedCache[lang] ??= { ...dictionaries[BASE_LANGUAGE], ...dictionaries[lang] })
}

/** 底层翻译器 */
const translate = i18n.translator<Dict>(currentDict, resolveTemplate as i18n.TemplateResolver)

/** 获取翻译文本；键缺失时回退为键本身，保持与旧实现一致的兜底行为 */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(key, params as never) ?? key
}

/** 检测系统语言 */
function detectSystemLanguage(): Language {
  const lang = navigator.language
  if (lang.startsWith("zh")) return "zh-CN"
  return "en"
}

/** 初始化语言设置 */
export async function initI18n() {
  try {
    const lang = await SettingsService.GetSetting("language")

    if (lang && lang !== "system" && lang in dictionaries) {
      setLanguage(lang as Language)
      setUserLanguageChoice(lang as Language)
    } else {
      setLanguage(detectSystemLanguage())
      setUserLanguageChoice("system")
    }
  } catch {
    setLanguage(detectSystemLanguage())
    setUserLanguageChoice("system")
  }
}

/** 切换语言 */
export async function changeLanguage(lang: Language | "system") {
  const actualLang = lang === "system" ? detectSystemLanguage() : lang
  setLanguage(actualLang)
  setUserLanguageChoice(lang)
  try {
    await SettingsService.SetSetting("language", lang === "system" ? "" : lang)
  } catch (e) {
    console.warn("保存语言设置失败", e)
  }
}
