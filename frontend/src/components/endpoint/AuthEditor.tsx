// 认证信息编辑器
import { createSignal, Show } from 'solid-js'
import { t } from '@/hooks/useI18n'
import { type AuthType } from '@/lib/types'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const authTypeOptions = [
    { value: 'none', label: t('endpoint.auth.none') },
    { value: 'basic', label: t('endpoint.auth.basic') },
    { value: 'bearer', label: t('endpoint.auth.bearer') },
]

export function AuthEditor() {
    const [authType, setAuthType] = createSignal<AuthType>('none')
    const [username, setUsername] = createSignal('')
    const [password, setPassword] = createSignal('')
    const [token, setToken] = createSignal('')

    return (
        <div class="p-3 space-y-4">
            <div class="flex items-center gap-3">
                <label class="text-sm font-medium w-20 shrink-0">Type</label>
                <Select
                    options={authTypeOptions}
                    value={authType()}
                    onChange={(v) => setAuthType(v as AuthType)}
                    class="w-48"
                />
            </div>

            <Show when={authType() === 'basic'}>
                <div class="space-y-3">
                    <div class="flex items-center gap-3">
                        <label class="text-sm w-20 shrink-0">{t('endpoint.auth.username')}</label>
                        <Input value={username()} onInput={(e) => setUsername(e.currentTarget.value)} class="flex-1" />
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="text-sm w-20 shrink-0">{t('endpoint.auth.password')}</label>
                        <Input type="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} class="flex-1" />
                    </div>
                </div>
            </Show>

            <Show when={authType() === 'bearer'}>
                <div class="flex items-center gap-3">
                    <label class="text-sm w-20 shrink-0">{t('endpoint.auth.token')}</label>
                    <Input value={token()} onInput={(e) => setToken(e.currentTarget.value)} placeholder="Bearer token" class="flex-1" />
                </div>
            </Show>
        </div>
    )
}
