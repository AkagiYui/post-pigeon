// 顶栏布局组件
// 包含红绿灯区域、导航标签、全局操作按钮
// Windows 端额外包含窗口控制按钮（最小化、最大化、关闭）
import { Link, useLocation, useRouter } from "@tanstack/solid-router"
import { System, Window } from "@wailsio/runtime"
import { ArrowLeft, ChevronDown, Cog, FolderOpen, History, Minus, Pin, Settings, Square, SquareX, X } from "lucide-solid"
import { createEffect, createMemo, createResource, createSignal, For, type JSX, onMount, Show } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { useFullscreen } from "@/hooks/useFullscreen"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { activeProjectId, closeProject, getCurrentEnvironmentId, openProject, openProjectIds, projectEnvironments, projectNames, setActiveProjectId, setCurrentEnvironment, setProjectNames, setSettingsOpen, settingsOpen } from "@/stores/app"

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
  const isFullscreen = useFullscreen()

  // 判断当前是否在请求历史路由
  // 使用 createMemo 确保响应式追踪
  const isHistoryRoute = createMemo(() => {
    const pathname = location().pathname
    return pathname?.endsWith("/history") ?? false
  })

  // 判断当前是否在项目设置路由
  const isSettingsRoute = createMemo(() => {
    const pathname = location().pathname
    return pathname?.endsWith("/settings") ?? false
  })

  // 检测平台
  onMount(() => {
    setIsMac(System.IsMac())
  })

  // Windows 端窗口控制方法
  // Window 从 @wailsio/runtime 导出时已是当前窗口实例
  const [isMaximised, setIsMaximised] = createSignal(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = createSignal(false)

  // 监听窗口状态变化（最大化/还原）
  onMount(() => {
    if (!System.IsMac()) {
      Window.IsMaximised().then(setIsMaximised)
    }
  })

  // 监听路由变化，同步 activeProjectId
  // 注意：这里不自动调用 openProject，项目打开/关闭完全由用户交互控制
  createEffect(() => {
    const loc = location()
    const path = loc?.pathname
    if (path === "/") {
      // 在项目列表页面，清除激活项目
      setActiveProjectId(null)
    } else if (path?.startsWith("/project/")) {
      // 在项目详情页面，提取项目 ID
      const match = path.match(/^\/project\/([^/]+)/)
      if (match && match[1]) {
        const projectId = match[1]
        // 只在项目已在打开列表中时同步激活状态
        if (openProjectIds().includes(projectId)) {
          setActiveProjectId(projectId)
        }
      }
    }
  })
  // Windows 端双击标题栏切换最大化
  const handleDoubleClick = () => {
    if (!isMac()) {
      Window.ToggleMaximise()
      Window.IsMaximised().then(setIsMaximised)
    }
  }

  return (
    <div class="flex items-center h-(--titlebar-height) border-b border-border bg-surface shrink-0 select-none" style="--wails-draggable:drag" onDblClick={handleDoubleClick}>
      {/* 左侧：红绿灯占位区域（仅 macOS） */}
      <Show when={isMac() && !isFullscreen()}>
        <div class="w-18 shrink-0 flex items-center pl-3" />
      </Show>

      {/* 导航标签区域 - 移除 no-drag，让间隙区域可拖动窗口 */}
      <div class="ml-1 flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
        {/* 项目列表标签 */}
        <NavLink href="/" active={activeProjectId() === null}>
          <FolderOpen class="h-3.5 w-3.5" />
          <span>{t("nav.projects")}</span>
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
                router.navigate({ to: "/project/$id", params: { id }, from: "/" })
              }}
              onClose={() => {
                // 判断关闭的是否是当前激活的项目
                const isActiveProject = activeProjectId() === id
                // 关闭项目
                closeProject(id)
                // 只有关闭的是当前激活的项目时，才需要切换路由
                if (isActiveProject) {
                  const remaining = openProjectIds()
                  if (remaining.length > 0) {
                    // 导航到最后一个剩余项目
                    router.navigate({ to: "/project/$id", params: { id: remaining[remaining.length - 1] } })
                  } else {
                    // 没有剩余项目，导航到项目列表
                    router.navigate({ to: "/" })
                  }
                }
              }}
            />
          )}
        </For>
      </div>

      {/* 右侧：全局操作按钮 - 移除 no-drag，让间隙区域可拖动窗口 */}
      <div class="flex items-center gap-1 shrink-0 pr-2" onDblClick={(e) => e.stopPropagation()}>
        <Show when={activeProjectId()}>
          {/* 返回按钮 - 仅在当前处于历史或设置路由时显示 */}
          <Show when={isHistoryRoute() || isSettingsRoute()}>
            <Tooltip content={t("history.back")} placement="bottom">
              <Link to="/project/$id" params={{ id: activeProjectId()! }} class="flex items-center">
                <button class="btn-ghost gap-0.5">
                  <ArrowLeft class="h-4 w-4" />
                </button>
              </Link>
            </Tooltip>
          </Show>
          {/* 请求历史按钮 - 当前处于历史路由时高亮 */}
          <Tooltip content={t("nav.history")} placement="bottom">
            <Link to="/project/$id/history" params={{ id: activeProjectId()! }} class="flex items-center">
              <button class={cn("btn-ghost gap-0.5", isHistoryRoute() && "btn-ghost-active")}>
                <History class="h-4 w-4" />
                <span class="hidden md:inline text-sm">{t("nav.history")}</span>
              </button>
            </Link>
          </Tooltip>
          {/* 项目设置按钮 - 当前处于设置路由时高亮 */}
          <Tooltip content={t("nav.projectSettings")} placement="bottom">
            <Link to="/project/$id/settings" params={{ id: activeProjectId()! }} class="flex items-center">
              <button class={cn("btn-ghost gap-0.5", isSettingsRoute() && "btn-ghost-active")}>
                <Cog class="h-4 w-4" />
                <span class="hidden md:inline text-sm">{t("nav.settings")}</span>
              </button>
            </Link>
          </Tooltip>
          {/* 环境选择下拉框 */}
          <EnvironmentSelect />
          {/* 低对比度分隔线 */}
          <div class="w-px h-4 bg-border/40 mx-0.5" />
        </Show>
        {/* 全局设置按钮 */}
        <Tooltip content={t("nav.settings")} placement="bottom">
          <button class="btn-ghost" onClick={() => setSettingsOpen(true)}>
            <Settings class="h-4 w-4" />
          </button>
        </Tooltip>
        {/* 窗口置顶按钮 */}
        <Tooltip content={isAlwaysOnTop() ? t("nav.alwaysOnTop.off") : t("nav.alwaysOnTop")} placement="bottom">
          <button
            class="btn-ghost"
            style={isAlwaysOnTop() ? { color: "var(--color-accent)" } : undefined}
            onClick={() => {
              const newValue = !isAlwaysOnTop()
              setIsAlwaysOnTop(newValue)
              Window.SetAlwaysOnTop(newValue)
            }}
          >
            <Pin class="h-4 w-4 transition-transform" style={isAlwaysOnTop() ? { transform: "rotate(45deg)" } : undefined} />
          </button>
        </Tooltip>
      </div>

      {/* Windows 端：窗口控制按钮（最小化、最大化/还原、关闭） */}
      <Show when={!isMac()}>
        <div class="flex items-center shrink-0" style="--wails-draggable:no-drag">
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
            title={isMaximised() ? "还原" : "最大化"}
          >
            <Show when={isMaximised()} fallback={<Square class="h-3.5 w-3.5" />}>
              <SquareX class="h-3.5 w-3.5" />
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
        "flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors shrink-0 w-18 justify-center",
        props.active
          ? "bg-accent-muted text-accent font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {props.children}
    </Link>
  )
}

/** 项目标签（Chrome 风格，带关闭按钮） */
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
        "relative flex items-center pl-3 pr-2 py-1 text-sm rounded-md cursor-pointer transition-colors group font-medium max-w-2222 min-w-16",
        props.active
          ? "bg-accent-muted text-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
      onClick={props.onClick}
    >
      {/* 标题文字 - 左对齐，超出渐隐 */}
      <span class="tab-title-fade flex-1 text-left">{project() || props.projectId.slice(0, 8)}</span>
      {/* 关闭按钮 - 位于右侧，悬停时显示 */}
      <button
        class="ml-0.5 shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted/80 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          props.onClose()
        }}
      >
        <X class="h-3 w-3" />
      </button>
    </div>
  )
}

/** 环境选择下拉框组件 */
function EnvironmentSelect() {
  const projectId = activeProjectId
  // 环境选项（直接显示项目下的实际环境列表）
  const envOptions = () => {
    const id = projectId()
    if (!id) return []
    const envs = projectEnvironments()[id] || []
    return envs.map((e: any) => ({ value: e.id, label: e.name }))
  }

  // 当前选中的环境
  const currentEnv = () => {
    const id = projectId()
    return id ? getCurrentEnvironmentId(id) : ""
  }

  // 切换环境
  const handleEnvChange = (envId: string) => {
    const id = projectId()
    if (id) {
      setCurrentEnvironment(id, envId)
    }
  }

  return (
    <Select
      options={envOptions()}
      value={currentEnv()}
      onChange={handleEnvChange}
      size="xs"
      textSize="default"
      hideChevron
      class="min-w-28 [&>button]:border-0 [&>button]:bg-transparent [&>button]:rounded-md [&>button]:hover:bg-muted [&>button]:whitespace-nowrap"
    />
  )
}
