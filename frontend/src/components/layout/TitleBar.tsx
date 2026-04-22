// 顶栏布局组件
// 包含红绿灯区域、导航标签、全局操作按钮
// Windows 端额外包含窗口控制按钮（最小化、最大化、关闭）
import { type JSX, For, Show, createEffect, createSignal, onMount, createResource } from 'solid-js'
import { Link, useRouter, useLocation } from '@tanstack/solid-router'
import { Settings, X, FolderOpen, Minus, Square, XSquare } from 'lucide-solid'
import { System, Window } from '@wailsio/runtime'
import { t } from '@/hooks/useI18n'
import { openProjectIds, activeProjectId, closeProject, openProject, setActiveProjectId, settingsOpen, setSettingsOpen, projectNames, setProjectNames } from '@/stores/app'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ProjectService } from '@/../bindings/post-pigeon/internal/services'

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
    const location = useLocation()
    const [isMac, setIsMac] = createSignal(false)

    // 检测平台
    onMount(() => {
        setIsMac(System.IsMac())
    })

    // Windows 端窗口控制方法
    // Window 从 @wailsio/runtime 导出时已是当前窗口实例
    const [isMaximised, setIsMaximised] = createSignal(false)

    // 监听窗口状态变化（最大化/还原）
    onMount(() => {
        if (!System.IsMac()) {
            Window.IsMaximised().then(setIsMaximised)
        }
    })

    // 监听路由变化，自动同步 activeProjectId
    createEffect(() => {
        const loc = location()
        const path = loc?.pathname
        if (path === '/') {
            // 在项目列表页面，清除激活项目
            setActiveProjectId(null)
        } else if (path?.startsWith('/project/')) {
            // 在项目详情页面，提取项目 ID 并设置激活项目
            const match = path.match(/^\/project\/([^/]+)/)
            if (match && match[1]) {
                const projectId = match[1]
                // 确保项目在打开列表中
                if (!openProjectIds().includes(projectId)) {
                    openProject(projectId)
                } else {
                    setActiveProjectId(projectId)
                }
            }
        }
    })
    return (
        <div class="flex items-center h-(--titlebar-height) border-b border-border bg-surface shrink-0 select-none" style="--wails-draggable:drag">
            {/* 左侧：红绿灯占位区域（仅 macOS） */}
            <Show when={isMac()}>
                <div class="w-18 shrink-0 flex items-center pl-3" />
            </Show>

            {/* 导航标签区域 */}
            <div class="ml-1 flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar" style="--wails-draggable:no-drag">
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
                                // 点击项目标签时，打开项目并导航
                                openProject(id)
                                router.navigate({ to: '/project/$id', params: { id }, from: '/' })
                            }}
                            onClose={() => closeProject(id)}
                        />
                    )}
                </For>
            </div>

            {/* 右侧：全局操作按钮 */}
            <div class="flex items-center gap-1 shrink-0 pr-2" style="--wails-draggable:no-drag">
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

            {/* Windows 端：窗口控制按钮（最小化、最大化/还原、关闭） */}
            <Show when={!isMac()}>
                <div class="flex items-center shrink-0 ml-1" style="--wails-draggable:no-drag">
                    <button
                        class="winctrl-btn"
                        onClick={() => Window.Minimise()}
                        title="最小化"
                    >
                        <Minus class="h-4 w-4" />
                    </button>
                    <button
                        class="winctrl-btn"
                        onClick={() => {
                            Window.ToggleMaximise()
                            // 切换后更新最大化状态
                            Window.IsMaximised().then(setIsMaximised)
                        }}
                        title={isMaximised() ? '还原' : '最大化'}
                    >
                        <Show when={isMaximised()} fallback={<Square class="h-3.5 w-3.5" />}>
                            <XSquare class="h-3.5 w-3.5" />
                        </Show>
                    </button>
                    <button
                        class="winctrl-btn winctrl-close"
                        onClick={() => Window.Close()}
                        title="关闭"
                    >
                        <X class="h-4 w-4" />
                    </button>
                </div>
            </Show>
        </div>
    )
}

/** 导航链接 */
function NavLink(props: { href: string; active: boolean; children: JSX.Element }) {
    return (
        <Link
            to={props.href}
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
    // 从缓存中获取项目名称
    const [project] = createResource(() => props.projectId, async (id) => {
        // 先检查缓存
        const cachedName = projectNames()[id]
        if (cachedName) {
            return cachedName
        }
        // 从后端加载
        const project = await ProjectService.GetProject(id)
        if (project?.name) {
            // 缓存项目名称
            setProjectNames(prev => ({ ...prev, [id]: project.name }))
            return project.name
        }
        return id.slice(0, 8)
    })

    return (
        <div
            class={cn(
                'relative flex items-center px-3 py-1 text-sm rounded-md cursor-pointer transition-colors group',
                props.active
                    ? 'bg-accent-muted text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={props.onClick}
        >
            {/* 标题文字 */}
            <span>{project() || props.projectId.slice(0, 8)}</span>
            {/* 关闭按钮，绝对定位覆盖在标题右侧 */}
            <button
                class="absolute right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-all bg-inherit"
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
