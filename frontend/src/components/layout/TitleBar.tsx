// 顶栏布局组件
// 包含红绿灯区域、导航标签、全局操作按钮
import { type JSX, For, Show } from 'solid-js'
import { Link, useRouter } from '@tanstack/solid-router'
import { Settings, X, FolderOpen } from 'lucide-solid'
import { t } from '@/hooks/useI18n'
import { openProjectIds, activeProjectId, closeProject, settingsOpen, setSettingsOpen } from '@/stores/app'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface TitleBarProps {
    /** 项目标签点击回调 */
    onProjectClick?: (id: string) => void
}

/**
 * TitleBar 顶栏组件
 * macOS 风格，红绿灯居中，导航标签在右侧
 */
export function TitleBar(props: TitleBarProps) {
    const router = useRouter()
    return (
        <div class="flex items-center h-[var(--titlebar-height)] border-b border-border bg-surface shrink-0 select-none">
            {/* 左侧：红绿灯占位区域 */}
            <div class="w-[76px] shrink-0 flex items-center pl-3" />

            {/* 导航标签区域 */}
            <div class="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
                {/* 项目列表标签 */}
                <NavLink href="/" active={activeProjectId() === null}>
                    <FolderOpen class="h-3.5 w-3.5" />
                    <span>{t('nav.projects')}</span>
                </NavLink>

                {/* 打开的项目标签 */}
                <For each={openProjectIds()}>
                    {(id) => (
                        <ProjectTab
                            projectId={id}
                            active={activeProjectId() === id}
                            onClick={() => {
                                router.navigate({ to: '/project/$id', params: { id }, from: '/' })
                            }}
                            onClose={() => closeProject(id)}
                        />
                    )}
                </For>
            </div>

            {/* 右侧：全局操作按钮 */}
            <div class="flex items-center gap-1 pr-3 shrink-0">
                <Show when={activeProjectId()}>
                    <Tooltip content={t('nav.projectSettings')}>
                        <button class="btn-ghost">
                            <Settings class="h-4 w-4" />
                        </button>
                    </Tooltip>
                </Show>
                <Tooltip content={t('nav.settings')}>
                    <button class="btn-ghost" onClick={() => setSettingsOpen(true)}>
                        <Settings class="h-4 w-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}

/** 导航链接 */
function NavLink(props: { href: string; active: boolean; children: JSX.Element }) {
    return (
        <Link
            href={props.href}
            class={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors',
                props.active
                    ? 'bg-accent-muted text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
        >
            {props.children}
        </Link>
    )
}

/** 项目标签（带关闭按钮） */
function ProjectTab(props: { projectId: string; active: boolean; onClick: () => void; onClose: () => void }) {
    // TODO: 从后端获取项目名称
    const projectName = () => props.projectId.slice(0, 8)

    return (
        <div
            class={cn(
                'flex items-center gap-1.5 px-3 py-1 text-sm rounded-md cursor-pointer transition-colors group',
                props.active
                    ? 'bg-accent-muted text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={props.onClick}
        >
            <span>{projectName()}</span>
            <button
                class="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-all"
                onClick={(e) => {
                    e.stopPropagation()
                    // TODO: 确认关闭弹窗
                    props.onClose()
                }}
            >
                <X class="h-3 w-3" />
            </button>
        </div>
    )
}
