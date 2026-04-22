// 语言设置组件
import { t, userLanguageChoice, changeLanguage } from '@/hooks/useI18n'
import { Select } from '@/components/ui/select'

/** 语言选项 */
const languageOptions = [
    { value: 'system', label: '跟随系统 / System' },
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en', label: 'English' },
]

/**
 * LanguageSettings 语言设置
 */
export function LanguageSettings() {
    return (
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <label class="text-sm text-foreground">{t('settings.language')}</label>
                <Select
                    options={languageOptions}
                    value={userLanguageChoice()}
                    onChange={(v) => changeLanguage(v as 'zh-CN' | 'en' | 'system')}
                    class="w-32"
                />
            </div>
        </div>
    )
}
