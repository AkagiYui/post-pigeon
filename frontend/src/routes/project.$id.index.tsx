// 项目工作区索引路由 - 默认显示接口管理页面
// 包含接口管理、环境切换等核心功能
import { createFileRoute, useParams } from "@tanstack/solid-router"
import { createSignal, onMount, Show } from "solid-js"

import type { Project } from "@/../bindings/PostPigeon/internal/models"
import { EnvironmentService, ProjectService } from "@/../bindings/PostPigeon/internal/services"
import { ApiManagement } from "@/components/endpoint/ApiManagement"
import { t } from "@/hooks/useI18n"
import { setProjectEnvironmentsList } from "@/stores/app"
import { toastError } from "@/stores/toast"

export const Route = createFileRoute("/project/$id/")({
  component: ProjectWorkspacePage,
})

function ProjectWorkspacePage() {
  const params = useParams({ from: "/project/$id" })
  const [project, setProject] = createSignal<Project | null>(null)
  const [loading, setLoading] = createSignal(true)

  onMount(async () => {
    try {
      setLoading(true)
      // 在 SolidJS 中，params 是一个访问器函数，需要调用它
      const currentParams = params()
      const proj = await ProjectService.GetProject(currentParams.id)
      if (!proj) {
        // 项目不存在，直接返回
        setLoading(false)
        return
      }
      setProject(proj)

      // 模块树由 ApiManagement 自行加载，这里只需要环境列表
      const envList = await EnvironmentService.ListEnvironments(currentParams.id)

      // 将环境列表存储到全局 store
      setProjectEnvironmentsList(currentParams.id, envList || [])
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    } finally {
      setLoading(false)
    }
  })

  return (
    <Show
      when={!loading()}
      fallback={
        <div class="flex items-center justify-center h-full">
          <p class="text-muted-foreground">{t("app.loading")}</p>
        </div>
      }
    >
      <Show
        when={project()}
        fallback={
          <div class="flex items-center justify-center h-full">
            <p class="text-muted-foreground">{t("project.notFound")}</p>
          </div>
        }
      >
        <ApiManagement projectId={params().id} />
      </Show>
    </Show>
  )
}
