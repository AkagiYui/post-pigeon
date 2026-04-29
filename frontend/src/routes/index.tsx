// 项目列表页面 - 首页
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import {
  createSortable,
  DragDropProvider,
  DragDropSensors,
  type DragEvent,
  DragOverlay,
  SortableProvider,
  transformStyle,
} from "@thisbeyond/solid-dnd"
import { FolderOpen, GripVertical, Plus, Trash2, TriangleAlert, Upload } from "lucide-solid"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { ContextMenu } from "@/components/ui/context-menu"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { activeProjectId as storeActiveProjectId, closeProject, openProject, openProjectIds } from "@/stores/app"

interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * 可拖拽排序的项目卡片组件
 */
function SortableProjectCard(props: {
  project: Project
  onDelete: (project: Project) => void
  onClick: () => void
}) {
  // 创建可拖拽排序的实例，sortable 既是一个指令函数，也包含属性和方法
  const sortable = createSortable(props.project.id)

  return (
    <div
      // use:sortable 指令使元素可拖拽排序
      use:sortable={sortable}
      class={cn(
        "group flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer",
        "bg-surface",
        sortable.isActiveDraggable
          ? "border-accent shadow-lg shadow-accent/10 z-10 opacity-30"
          : "border-border hover:border-accent/30 hover:bg-accent-muted/30",
      )}
      style={{
        // 应用拖拽时的 transform 动画（由 solid-dnd 自动计算）
        transition: sortable.isActiveDraggable
          ? "none"
          : "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
        ...transformStyle(sortable.transform),
      }}
      onClick={() => props.onClick()}
    >
      {/* 拖拽手柄 */}
      <div
        class="flex items-center justify-center w-8 h-8 rounded-md shrink-0
                   text-muted-foreground/40 hover:text-muted-foreground
                   hover:bg-accent/10 cursor-grab active:cursor-grabbing transition-colors"
        {...sortable.dragActivators}
        onMouseDown={(e) => {
          // 阻止事件冒泡，防止点击拖拽手柄时触发卡片点击
          e.stopPropagation()
        }}
      >
        <GripVertical class="h-4 w-4" />
      </div>

      {/* 项目图标 */}
      <div class="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
        <span class="text-accent font-bold text-lg">{props.project.name[0]}</span>
      </div>

      {/* 项目信息 */}
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-foreground truncate">{props.project.name}</h3>
        <Show when={props.project.description}>
          <p class="text-sm text-muted-foreground truncate">{props.project.description}</p>
        </Show>
      </div>

      {/* 删除按钮 */}
      <Button
        variant="ghost"
        size="icon-sm"
        class="opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          props.onDelete(props.project)
        }}
      >
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const navigate = useNavigate({ from: "/" })
  const [projects, setProjects] = createSignal<Project[]>([])
  const [loading, setLoading] = createSignal(true)
  const [createOpen, setCreateOpen] = createSignal(false)
  const [newName, setNewName] = createSignal("")
  const [newDesc, setNewDesc] = createSignal("")
  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false)
  const [projectToDelete, setProjectToDelete] = createSignal<Project | null>(null)

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true)
      const list = await ProjectService.ListProjects()
      setProjects(list || [])
    } catch (e) {
      console.error("加载项目列表失败", e)
    } finally {
      setLoading(false)
    }
  }

  onMount(loadProjects)

  // 创建项目
  const handleCreate = async () => {
    if (!newName().trim()) return
    try {
      await ProjectService.CreateProject(newName().trim(), newDesc().trim())
      setCreateOpen(false)
      setNewName("")
      setNewDesc("")
      await loadProjects()
    } catch (e) {
      console.error("创建项目失败", e)
    }
  }

  // 打开删除确认对话框
  const handleDelete = (project: Project) => {
    setProjectToDelete(project)
    setDeleteConfirmOpen(true)
  }

  // 确认删除项目
  const confirmDelete = async () => {
    const project = projectToDelete()
    if (!project) return
    try {
      await ProjectService.DeleteProject(project.id)

      // 如果该项目在顶栏有打开的标签页，自动关闭
      if (openProjectIds().includes(project.id)) {
        const isActiveProject = storeActiveProjectId() === project.id
        closeProject(project.id)
        // 如果被删除的是当前激活的项目，切换到其他项目或返回列表页
        if (isActiveProject) {
          const remaining = openProjectIds()
          if (remaining.length > 0) {
            navigate({ to: "/project/$id", params: { id: remaining[remaining.length - 1] } })
          } else {
            navigate({ to: "/" })
          }
        }
      }

      setDeleteConfirmOpen(false)
      setProjectToDelete(null)
      await loadProjects()
    } catch (e) {
      console.error("删除项目失败", e)
    }
  }

  // 导入项目
  const handleImport = async () => {
    // TODO: 实现文件选择对话框
    console.log("导入项目")
  }

  // 拖拽排序结束回调
  const handleDragEnd = async (event: DragEvent) => {
    const { draggable, droppable } = event
    // 清除拖拽中的高亮状态
    setActiveProjectId(null)
    // 如果没有拖拽到有效目标位置，不做任何操作
    if (!droppable || draggable.id === droppable.id) return

    const currentProjects = projects()
    const oldIndex = currentProjects.findIndex((p) => p.id === draggable.id)
    const newIndex = currentProjects.findIndex((p) => p.id === droppable.id)
    if (oldIndex === -1 || newIndex === -1) return

    // 重新排列项目列表
    const reordered = [...currentProjects]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    setProjects(reordered)

    // 将新的排序保存到后端
    try {
      await ProjectService.ReorderProjects(reordered.map((p) => p.id))
    } catch (e) {
      console.error("保存项目排序失败", e)
      // 保存失败时重新加载原始顺序
      await loadProjects()
    }
  }

  // 当前正在拖拽的项目 ID（用于 DragOverlay 显示）
  const [activeProjectId, setActiveProjectId] = createSignal<string | null>(null)

  // 拖拽开始时记录被拖拽的项目 ID
  const handleDragStart = (event: DragEvent) => {
    setActiveProjectId(event.draggable.id as string)
  }

  // 根据 activeProjectId 查找对应的项目数据（用于 overlay 渲染）
  const activeProject = createMemo(() => {
    const id = activeProjectId()
    if (!id) return null
    return projects().find((p) => p.id === id) ?? null
  })

  // 生成右键菜单项（使用闭包保存 navigate）
  const getMenuItems = (project: Project) => {
    return [
      {
        key: "open",
        label: t("project.open"),
        icon: <FolderOpen class="h-3.5 w-3.5" />,
        onClick: () => {
          openProject(project.id)
          navigate({ to: "/project/$id", params: { id: project.id }, from: "/" })
        },
      },
      { key: "sep1", label: "", separator: true },
      {
        key: "delete",
        label: t("project.delete"),
        icon: <Trash2 class="h-3.5 w-3.5" />,
        onClick: () => handleDelete(project),
      },
    ]
  }

  return (
    // 外层容器：固定高度，防止溢出
    <div class="flex flex-col h-full overflow-hidden p-8">
      {/* 内容区域：限制最大宽度并居中 */}
      <div class="w-full max-w-2xl mx-auto flex flex-col h-full min-h-0">
        {/* 标题栏：固定在顶部，不参与滚动 */}
        <div class="flex items-center justify-between mb-6 shrink-0">
          <h1 class="text-2xl font-bold">{t("project.title")}</h1>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload class="h-3.5 w-3.5" />
              {t("project.import")}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus class="h-3.5 w-3.5" />
              {t("project.create")}
            </Button>
          </div>
        </div>

        {/* 项目列表区域：动态填充剩余高度，溢出时可滚动 */}
        <div class="flex-1 overflow-y-auto min-h-0">
          <Show
            when={projects().length > 0}
            fallback={
              <div class="text-center py-16">
                <FolderOpen class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p class="text-muted-foreground">{t("project.empty")}</p>
              </div>
            }
          >
            <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <DragDropSensors />
              <SortableProvider ids={projects().map((p) => p.id)}>
                <div class="flex flex-col gap-3 pb-4">
                  <For each={projects()}>
                    {(project) => (
                      <ContextMenu items={getMenuItems(project)}>
                        <SortableProjectCard
                          project={project}
                          onDelete={handleDelete}
                          onClick={() => {
                            openProject(project.id)
                            navigate({ to: "/project/$id", params: { id: project.id }, from: "/" })
                          }}
                        />
                      </ContextMenu>
                    )}
                  </For>
                </div>
              </SortableProvider>
              {/* DragOverlay 渲染在 DOM 顶层，不会被父容器裁剪 */}
              <DragOverlay>
                <Show when={activeProject()}>
                  {(project) => (
                    <div
                      class="flex items-center gap-3 p-4 rounded-lg border border-accent shadow-xl shadow-accent/15 scale-[1.02] bg-surface w-[calc(100vw-4rem)] max-w-160"
                    >
                      <div class="w-8 h-8 shrink-0" />
                      <div class="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                        <span class="text-accent font-bold text-lg">{project().name[0]}</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-foreground truncate">{project().name}</h3>
                        <Show when={project().description}>
                          <p class="text-sm text-muted-foreground truncate">{project().description}</p>
                        </Show>
                      </div>
                    </div>
                  )}
                </Show>
              </DragOverlay>
            </DragDropProvider>
          </Show>
        </div>
      </div>

      {/* 创建项目对话框 */}
      <Dialog open={createOpen()} onClose={() => setCreateOpen(false)} title={t("project.create")} closeOnEsc closeOnOverlayClick>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("project.name")}</label>
            <Input
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              placeholder="My API Project"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("project.description")}</label>
            <Input
              value={newDesc()}
              onInput={(e) => setNewDesc(e.currentTarget.value)}
              placeholder={t("project.description")}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!newName().trim()}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteConfirmOpen()}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setProjectToDelete(null)
        }}
        title={t("project.delete")}
        closeOnEsc
        closeOnOverlayClick
      >
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <TriangleAlert class="h-5 w-5 text-red-500" />
            </div>
            <div class="flex-1">
              <p class="text-foreground">
                {t("project.deleteConfirm")}
              </p>
              <Show when={projectToDelete()}>
                <p class="text-sm text-muted-foreground mt-1">
                  {projectToDelete()?.name}
                </p>
              </Show>
              {/* 如果该项目已在顶栏打开，提示删除后将自动关闭标签页 */}
              <Show when={projectToDelete() && openProjectIds().includes(projectToDelete()!.id)}>
                <p class="text-sm text-amber-500 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                  <TriangleAlert class="h-3.5 w-3.5 shrink-0" />
                  此项目当前已打开，删除后将自动关闭标签页
                </p>
              </Show>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setProjectToDelete(null)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("project.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
