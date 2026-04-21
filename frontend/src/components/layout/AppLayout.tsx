// 应用主布局组件
import { Show } from 'solid-js'
import { TitleBar } from './TitleBar'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { settingsOpen, setSettingsOpen } from '@/stores/app'

export interface AppLayoutProps {
    children?: any
}

/**
 * AppLayout 应用主布局
 * 顶栏 + 主体内容区域
 */
export function AppLayout(props: AppLayoutProps) {
    return (
        <div class="flex flex-col h-screen bg-background text-foreground">
            {/* 顶栏 */}
            <TitleBar />

            {/* 主体内容区域 */}
            <main class="flex-1 overflow-hidden">
                {props.children}
            </main>

            {/* 设置模态框 */}
            <SettingsModal
                open={settingsOpen()}
                onClose={() => setSettingsOpen(false)}
            />
        </div>
    )
}
