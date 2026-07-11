// 顶栏布局组件
// 包含红绿灯区域、导航标签、全局操作按钮
// Windows 端额外包含窗口控制按钮（最小化、最大化、关闭）
import { Icon } from "@iconify-icon/solid"
import { Link, useLocation, useRouter } from "@tanstack/solid-router"
import { createSortable, DragDropProvider, type DragEvent, DragOverlay, SortableProvider, transformStyle, useDragDropContext } from "@thisbeyond/solid-dnd"
import { System, Window } from "@wailsio/runtime"
import { createEffect, createMemo, createResource, createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js"

import { ProjectService } from "@/../bindings/PostPigeon/internal/services"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { useFullscreen } from "@/hooks/useFullscreen"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { activeProjectId, closeProject, getCurrentEnvironmentId, openProject, openProjectIds, projectEnvironments, projectNames, reorderOpenProjects, setActiveProjectId, setCurrentEnvironment, setProjectNames, setSettingsOpen, settingsOpen } from "@/stores/app"

export interface TitleBarProps {
  /** 项目标签点击回调 */
  onProjectClick?: (id: string) => void
}

/**
 * 仅按位移激活的指针传感器，替换 solid-dnd 默认的 DragDropSensors。
 *
 * 默认传感器（createPointerSensor）除了「位移 >10px 激活」外，还带一个 250ms 长按激活定时器：
 * 只要在标签上按住略超 250ms 且不移动，就会 dragStart 进入拖拽态。而顶栏是 --wails-draggable:drag
 * 拖拽区，在 WKWebView 里对「静止按下」的项目标签常收不到终结的 pointerup，导致这种「单击即激活」
 * 的拖拽永远无法 dragEnd —— 拖拽态卡死、光标停在抓取样式、无法拖动也无法退出。
 *
 * 这里去掉时间激活，只保留位移激活：静止单击永不进入拖拽（pointerup/pointercancel 直接 detach 收尾），
 * 仅当指针真正移动超过阈值才开始拖拽，与用户「有意拖拽」的操作一致；真实拖拽结束时的 pointerup 一路
 * 有指针事件流，可靠触发收尾。同时显式监听 pointercancel（默认传感器不监听），WKWebView 中途收回
 * 指针时也能 detach + dragEnd，双重兜底。
 */
function DistancePointerSensor() {
  const context = useDragDropContext()
  if (!context) return null
  const [state, { addSensor, removeSensor, sensorStart, sensorMove, sensorEnd, dragStart, dragEnd }] = context

  const id = "pointer-sensor"
  const activationDistance = 10
  const initial = { x: 0, y: 0 }
  let draggableId: string | number | null = null
  // 激活时被按下的标签节点与指针 id，用于对其做 setPointerCapture
  let activationNode: Element | null = null
  let activePointerId = -1
  const isActiveSensor = () => state.active.sensorId === id

  const attach = (event: PointerEvent, dId: string | number) => {
    if (event.button !== 0) return
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerEnd)
    document.addEventListener("pointercancel", onPointerEnd)
    draggableId = dId
    // currentTarget 是绑定了 pointerdown 激活器的标签节点本身，作为指针捕获对象
    activationNode = event.currentTarget as Element
    activePointerId = event.pointerId
    initial.x = event.clientX
    initial.y = event.clientY
  }
  const releaseCapture = () => {
    if (activationNode && activePointerId !== -1) {
      try {
        activationNode.releasePointerCapture(activePointerId)
      } catch {
        // 指针已释放或从未捕获时忽略
      }
    }
    activationNode = null
    activePointerId = -1
  }
  const detach = () => {
    document.removeEventListener("pointermove", onPointerMove)
    document.removeEventListener("pointerup", onPointerEnd)
    document.removeEventListener("pointercancel", onPointerEnd)
  }
  const onPointerMove = (event: PointerEvent) => {
    const coordinates = { x: event.clientX, y: event.clientY }
    if (!state.active.sensor) {
      const dx = coordinates.x - initial.x
      const dy = coordinates.y - initial.y
      // 仅位移超过阈值才激活拖拽；不设时间激活，静止按下永不进入拖拽态
      if (Math.sqrt(dx * dx + dy * dy) > activationDistance && draggableId != null) {
        // 捕获指针：拖拽激活后无论光标移到主内容区（含 iframe/编辑器/预览）还是移出窗口，
        // pointermove/pointerup 都持续派发到该标签节点并冒泡到 document，悬浮副本得以跟随
        // 光标到任意位置，而非在离开顶栏时卡在顶栏内侧边缘。仅在真正激活拖拽时捕获，
        // 静止单击（不触达此处）不受影响、click 选中项目照常。
        try {
          activationNode?.setPointerCapture(activePointerId)
        } catch {
          // 指针非活动态时忽略，退化为原生冒泡（至少顶栏内可用）
        }
        sensorStart(id, initial)
        dragStart(draggableId)
      }
    }
    if (isActiveSensor()) {
      event.preventDefault()
      sensorMove(coordinates)
    }
  }
  const onPointerEnd = (event: PointerEvent) => {
    detach()
    releaseCapture()
    if (isActiveSensor()) {
      event.preventDefault()
      dragEnd()
      sensorEnd()
    }
  }

  onMount(() => {
    addSensor({ id, activators: { pointerdown: attach } })
  })
  onCleanup(() => {
    removeSensor(id)
  })
  return null
}

/**
 * TitleBar 顶栏组件
 * macOS 风格，红绿灯居中，导航标签在右侧
 */
export function TitleBar(props: TitleBarProps) {
  const router = useRouter()
  const location = useLocation()
  const [isMac, setIsMac] = createSignal(false)
  // 是否为无边框桌面端（Windows/Linux）。仅此场景才需要前端自绘窗口控制按钮；
  // 浏览器环境下 window._wails 不存在，IsWindows/IsLinux 均为 false，避免误显示三大金刚。
  const [isFramelessDesktop, setIsFramelessDesktop] = createSignal(false)
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
    setIsFramelessDesktop(System.IsWindows() || System.IsLinux())
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

  // 标签滚动相关状态
  let tabsContainerRef: HTMLDivElement | undefined
  const [canScrollLeft, setCanScrollLeft] = createSignal(false)
  const [canScrollRight, setCanScrollRight] = createSignal(false)

  // 更新滚动按钮显示状态
  const updateScrollButtons = () => {
    if (!tabsContainerRef) return
    const el = tabsContainerRef
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  // 滚轮横向滚动处理
  const handleTabWheel = (e: WheelEvent) => {
    if (!tabsContainerRef) return
    const el = tabsContainerRef
    // 阻止默认垂直滚动
    e.preventDefault()
    // 将垂直滚轮增量转换为水平滚动
    el.scrollLeft += e.deltaY
    updateScrollButtons()
  }

  // 滚动到指定方向
  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsContainerRef) return
    const el = tabsContainerRef
    const scrollAmount = 200
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
    // 滚动完成后更新按钮状态
    setTimeout(updateScrollButtons, 200)
  }

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
  // 双击标题栏空白区域切换最大化/还原（全平台支持，含 macOS 的 zoom 行为）
  // 仅当双击落在真正的空白拖拽区域时触发；忽略标签、按钮、链接、下拉框等交互元素，
  // 避免双击项目标签或工具按钮时误触发窗口缩放。
  const handleDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest("button, a, input, select, [data-no-maximize]")) return
    Window.ToggleMaximise()
    Window.IsMaximised().then(setIsMaximised)
  }

  // ---- 项目标签拖拽排序 ----
  // 当前正在拖拽的标签 ID（用于 DragOverlay 渲染悬浮副本）
  const [draggingTabId, setDraggingTabId] = createSignal<string | null>(null)

  const handleTabDragStart = (event: DragEvent) => {
    setDraggingTabId(event.draggable.id as string)
  }

  const handleTabDragEnd = (event: DragEvent) => {
    const { draggable, droppable } = event
    setDraggingTabId(null)
    // 未落到有效目标或原地释放时不做处理
    if (!droppable || draggable.id === droppable.id) return
    const ids = openProjectIds()
    const oldIndex = ids.indexOf(draggable.id as string)
    const newIndex = ids.indexOf(droppable.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...ids]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    // 仅调整标签顺序（localStorage 持久化），不影响后端项目列表排序
    reorderOpenProjects(reordered)
  }

  // 拖拽中标签的显示名称（用于 overlay）
  const draggingTabName = createMemo(() => {
    const id = draggingTabId()
    if (!id) return ""
    return projectNames()[id] || id.slice(0, 8)
  })

  // 拖拽收尾安全网：拖拽进行中若窗口失焦（如 Alt+Tab 切走），传感器收不到 pointerup，
  // 拖拽态会残留。此时补发一个 pointerup 到 document，驱动 DistancePointerSensor 的收尾
  // （detach + dragEnd）。pointercancel 已由传感器自身监听处理，无需在此重复。
  onMount(() => {
    const forceEndTabDrag = () => {
      if (draggingTabId() == null) return
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }))
    }
    window.addEventListener("blur", forceEndTabDrag)
    onCleanup(() => {
      window.removeEventListener("blur", forceEndTabDrag)
      document.body.classList.remove("dragging-tab")
    })
  })

  // 拖拽标签期间给 body 挂标记类，触发 CSS 禁用主内容区 iframe 的指针事件（见 styles.css），
  // 使 pointermove/pointerup 能穿透 iframe 回到父文档，避免拖到主页面时卡顿或在 iframe 上松手卡死。
  createEffect(() => {
    document.body.classList.toggle("dragging-tab", draggingTabId() != null)
  })

  return (
    <div class="flex items-center h-(--titlebar-height) border-b border-border bg-surface shrink-0 select-none" style="--wails-draggable:drag" onDblClick={handleDoubleClick}>
      {/* 左侧：红绿灯占位区域（仅 macOS）。
          非 macOS（浏览器 / Windows / Linux）无红绿灯，用一小段留白避免首个「项目」
          按钮紧贴视口左边缘。 */}
      <Show when={isMac() && !isFullscreen()} fallback={<div class="w-2 shrink-0" />}>
        <div class="w-18 shrink-0 flex items-center pl-3" />
      </Show>

      {/* 导航标签区域 - 移除 no-drag，让间隙区域可拖动窗口 */}
      <div class="flex items-center flex-1 min-w-0 group/tabs">
        {/* 左侧滚动按钮 - 仅在可向左滚动时显示 */}
        <Show when={canScrollLeft()}>
          <button
            class="scroll-tab-btn -ml-1"
            onClick={() => scrollTabs("left")}
            title={t("nav.scrollLeft")}
          >
            <Icon icon="lucide:chevron-left" class="h-3.5 w-3.5" />
          </button>
        </Show>

        {/* 标签容器 */}
        <div
          ref={tabsContainerRef}
          class="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar"
          onWheel={handleTabWheel}
          onScroll={updateScrollButtons}
        >
          {/* 项目列表标签 */}
          <NavLink href="/" active={activeProjectId() === null}>
            <Icon icon="lucide:folder-open" class="h-3.5 w-3.5" />
            <span>{t("nav.projects")}</span>
          </NavLink>

          {/* 打开的项目标签（支持拖拽排序）
              外层包裹一个以字符串样式声明 --wails-draggable:no-drag 的容器：顶栏根节点是 drag
              区域，若标签落在 drag 区域内，按下拖动会被 Wails 识别为「拖动窗口」，使 solid-dnd
              收不到有效位移、无法排序。此处沿用窗口控制按钮相同的字符串写法（cssText 路径），
              比在每个标签上用响应式 style 对象设置自定义属性更稳妥。仅包裹标签本身，
              其后的空白仍归属可拖动容器，不影响拖拽移动窗口。 */}
          <div class="flex items-center gap-0.5 shrink-0" style="--wails-draggable:no-drag" data-no-maximize>
            <DragDropProvider onDragStart={handleTabDragStart} onDragEnd={handleTabDragEnd}>
              <DistancePointerSensor />
              <SortableProvider ids={openProjectIds()}>
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
              </SortableProvider>
              {/* 拖拽悬浮副本：渲染在 DOM 顶层，不会被标签容器裁剪 */}
              <DragOverlay>
                <Show when={draggingTabName()}>
                  <div class="flex items-center pl-3 pr-2 py-1 text-sm rounded-md font-medium bg-accent-muted text-accent shadow-lg shadow-accent/15 max-w-52 cursor-grabbing">
                    <span class="truncate pr-4">{draggingTabName()}</span>
                  </div>
                </Show>
              </DragOverlay>
            </DragDropProvider>
          </div>
        </div>

        {/* 右侧滚动按钮 - 仅在可向右滚动时显示 */}
        <Show when={canScrollRight()}>
          <button
            class="scroll-tab-btn -mr-1"
            onClick={() => scrollTabs("right")}
            title={t("nav.scrollRight")}
          >
            <Icon icon="lucide:chevron-right" class="h-3.5 w-3.5" />
          </button>
        </Show>
      </div>

      {/* 右侧：全局操作按钮 - 移除 no-drag，让间隙区域可拖动窗口 */}
      <div class="flex items-center gap-1 shrink-0 pr-2" onDblClick={(e) => e.stopPropagation()}>
        <Show when={activeProjectId()}>
          {/* 返回按钮 - 仅在当前处于历史或设置路由时显示 */}
          <Show when={isHistoryRoute() || isSettingsRoute()}>
            <Tooltip content={t("history.back")} placement="bottom">
              <Link to="/project/$id" params={{ id: activeProjectId()! }} class="flex items-center">
                <button class="btn-ghost gap-0.5">
                  <Icon icon="lucide:arrow-left" class="h-4 w-4" />
                </button>
              </Link>
            </Tooltip>
          </Show>
          {/* 请求历史按钮 - 当前处于历史路由时高亮 */}
          <Tooltip content={t("nav.history")} placement="bottom">
            <Link to="/project/$id/history" params={{ id: activeProjectId()! }} class="flex items-center">
              <button class={cn("btn-ghost gap-0.5", isHistoryRoute() && "btn-ghost-active")}>
                <Icon icon="lucide:history" class="h-4 w-4" />
                <span class="hidden md:inline text-sm">{t("nav.history")}</span>
              </button>
            </Link>
          </Tooltip>
          {/* 项目设置按钮 - 当前处于设置路由时高亮 */}
          <Tooltip content={t("nav.projectSettings")} placement="bottom">
            <Link to="/project/$id/settings" params={{ id: activeProjectId()! }} class="flex items-center">
              <button class={cn("btn-ghost gap-0.5", isSettingsRoute() && "btn-ghost-active")}>
                <Icon icon="lucide:cog" class="h-4 w-4" />
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
            <Icon icon="lucide:settings" class="h-4 w-4" />
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
            <Icon icon="lucide:pin" class="h-4 w-4 transition-transform" style={isAlwaysOnTop() ? { transform: "rotate(45deg)" } : undefined} />
          </button>
        </Tooltip>
      </div>

      {/* Windows/Linux 无边框桌面端：窗口控制按钮（最小化、最大化/还原、关闭） */}
      <Show when={isFramelessDesktop()}>
        <div class="flex items-center shrink-0" style="--wails-draggable:no-drag">
          <button
            class="winctrl-btn"
            onClick={() => Window.Minimise()}
            title={t("window.minimize")}
          >
            <Icon icon="lucide:minus" class="h-4 w-4" />
          </button>
          <button
            class="winctrl-btn"
            onClick={() => {
              Window.ToggleMaximise()
              // 切换后更新最大化状态
              Window.IsMaximised().then(setIsMaximised)
            }}
            title={isMaximised() ? t("window.restore") : t("window.maximize")}
          >
            <Show when={isMaximised()} fallback={<Icon icon="lucide:square" class="h-3.5 w-3.5" />}>
              <Icon icon="lucide:square-x" class="h-3.5 w-3.5" />
            </Show>
          </button>
          <button
            class="winctrl-btn winctrl-close"
            onClick={() => Window.Close()}
            title={t("window.close")}
          >
            <Icon icon="lucide:x" class="h-4 w-4" />
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
        // 宽度自适应内容：不同语言下「项目/Projects」标题长度不一，固定宽度会裁剪或留白
        "flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors shrink-0 justify-center whitespace-nowrap",
        props.active
          ? "bg-accent-muted text-accent font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {props.children}
    </Link>
  )
}

/** 项目标签（Chrome 风格，带关闭按钮，支持拖拽排序） */
function ProjectTab(props: { projectId: string; active: boolean; onClick: () => void; onClose: () => void }) {
  // 按需从后端加载项目名称并写入全局缓存（缓存缺失时才请求）
  // 注意：不直接使用 resource 返回值渲染，而是从 projectNames() 派生显示名称，
  // 这样项目名称在设置页保存后会实时更新到标签上。
  createResource(() => props.projectId, async (id) => {
    if (projectNames()[id]) return projectNames()[id]
    const project = await ProjectService.GetProject(id)
    if (project?.name) {
      setProjectNames(prev => ({ ...prev, [id]: project.name }))
    }
    return project?.name ?? ""
  })

  // 显示名称：始终从全局缓存派生，保证响应式更新
  const displayName = () => projectNames()[props.projectId] || props.projectId.slice(0, 8)

  // 可拖拽排序实例（sortable 既是指令函数，也承载拖拽状态与激活器）
  const sortable = createSortable(props.projectId)

  return (
    <div
      // use:sortable 指令使标签可拖拽排序
      use:sortable={sortable}
      // 展开拖拽激活器，使整个标签成为拖拽把手
      {...sortable.dragActivators}
      class={cn(
        "relative flex items-center pl-3 pr-2 py-1 text-sm rounded-md cursor-pointer group font-medium max-w-52 min-w-16",
        sortable.isActiveDraggable && "opacity-30",
        props.active
          ? "bg-accent-muted text-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
      style={{
        // 位于 --wails-draggable:drag 的顶栏内，需显式声明 no-drag，
        // 否则按下拖动标签会被系统识别为拖动窗口，导致排序失效。
        "--wails-draggable": "no-drag",
        // 拖拽时禁用位移过渡以保证跟手；释放后由 solid-dnd 计算补间动画。
        // 非拖拽态保留颜色过渡，维持悬停高亮的平滑效果。
        "transition": sortable.isActiveDraggable
          ? "none"
          : "transform 200ms ease, background-color 150ms ease, color 150ms ease",
        ...transformStyle(sortable.transform),
      }}
      // 标记为交互元素，避免双击标签触发窗口最大化
      data-no-maximize
      onClick={props.onClick}
      title={displayName()}
    >
      {/* 标题文字 - 始终为关闭按钮预留空间，避免关闭按钮淡出时文字回流到其下方造成闪烁 */}
      <span class="truncate flex-1 text-left pr-4">{displayName()}</span>
      {/* 关闭按钮 - 绝对定位不占布局，仅悬停时出现，底色也仅在悬停时出现 */}
      <button
        class="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          props.onClose()
        }}
      >
        <Icon icon="lucide:x" class="h-3 w-3" />
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
