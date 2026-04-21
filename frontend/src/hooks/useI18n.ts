// 国际化（i18n）管理
import { createSignal } from 'solid-js'
import { type Language } from '@/lib/types'
import zhCN from '@/i18n/zh-CN.json'
import en from '@/i18n/en.json'
import { SettingsService } from '@/../bindings/post-pigeon/internal/services'

/** 翻译资源映射 */
const resources: Record<Language, Record<string, string>> = {
    'zh-CN': zhCN as Record<string, string>,
    'en': en as Record<string, string>,
}

/** 当前语言 */
const [language, setLanguage] = createSignal<Language>('zh-CN')

export { language, setLanguage }

/** 获取翻译文本 */
export function t(key: string, params?: Record<string, string | number>): string {
    const lang = language()
    let text = resources[lang]?.[key] || resources['zh-CN']?.[key] || key

    // 替换模板变量
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, String(v))
        }
    }

    return text
}

/** 检测系统语言 */
function detectSystemLanguage(): Language {
    const lang = navigator.language
    if (lang.startsWith('zh')) return 'zh-CN'
    return 'en'
}

/** 初始化语言设置 */
export async function initI18n() {
    try {
        const lang = await SettingsService.GetSetting('language')

        if (lang && lang !== 'system' && lang in resources) {
            setLanguage(lang as Language)
        } else {
            setLanguage(detectSystemLanguage())
        }
    } catch {
        setLanguage(detectSystemLanguage())
    }
}

/** 切换语言 */
export async function changeLanguage(lang: Language | 'system') {
    const actualLang = lang === 'system' ? detectSystemLanguage() : lang
    setLanguage(actualLang)
    try {
        await SettingsService.SetSetting('language', lang === 'system' ? '' : lang)
    } catch (e) {
        console.warn('保存语言设置失败', e)
    }
}
