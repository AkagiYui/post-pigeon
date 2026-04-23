// 项目列表页面
import { useNavigate } from "@tanstack/solid-router"
import { Download, FolderOpen, Plus, Trash2, Upload } from "lucide-solid"
import { createSignal, For, onMount, Show } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { ContextMenu, type MenuItem } from "@/components/ui/context-menu"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { openProject } from "@/stores/app"

interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export function ProjectListPage() {
  const navigate = useNavigate({ from: "/" })
  const [projects, setProjects] = createSignal<Project[]>([])
  const [loading, setLoading] = createSignal(true)
  const [createOpen, setCreateOpen] = createSignal(false)
  const [newName, setNewName] = createSignal("")
  const [newDesc, setNewDesc] = createSignal("")

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

  // 删除项目
  const handleDelete = async (id: string) => {
    try {
      await ProjectService.DeleteProject(id)
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

  // 右键菜单
  const contextMenuItems = (project: Project): MenuItem[] => [
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
      onClick: () => handleDelete(project.id),
    },
  ]

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
            <div class="grid gap-3 pb-4">
              <For each={projects()}>
                {(project) => (
                  <ContextMenu items={contextMenuItems(project)}>
                    <div
                      class="group flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:border-accent/30 hover:bg-accent-muted/30 transition-all cursor-pointer"
                      onClick={() => {
                        openProject(project.id)
                        navigate({ to: "/project/$id", params: { id: project.id }, from: "/" })
                      }}
                    >
                      <div class="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                        <span class="text-accent font-bold text-lg">{project.name[0]}</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-medium text-foreground truncate">{project.name}</h3>
                        <Show when={project.description}>
                          <p class="text-sm text-muted-foreground truncate">{project.description}</p>
                        </Show>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        class="opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(project.id)
                        }}
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </ContextMenu>
                )}
              </For>
            </div>
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
    </div>
  )
}
