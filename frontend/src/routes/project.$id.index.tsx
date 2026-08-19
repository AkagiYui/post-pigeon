// 项目工作区索引路由 - 默认显示接口管理页面
// 包含接口管理、环境切换等核心功能
import { createFileRoute, useParams } from "@tanstack/solid-router"
import { createSignal, onMount, Show } from "solid-js"

import type { Project } from "@/../bindings/PostPigeon/internal/models"
import { EnvironmentService, ProjectService } from "@/../bindings/PostPigeon/internal/services"
import { ApiManagement } from "@/components/endpoint/ApiManagement"
import { t } from "@/hooks/useI18n"
import { getCurrentEnvironmentId, setCurrentEnvironment, setProjectEnvironmentsList } from "@/stores/app"
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

      // 选择当前环境：优先沿用已持久化且仍存在的选择，否则回退默认（正式环境 > 第一个）
      if (envList && envList.length > 0) {
        const persisted = getCurrentEnvironmentId(currentParams.id)
        const persistedValid = persisted && envList.some((env) => env.id === persisted)
        if (!persistedValid) {
          const productionEnv = envList.find((env) => env.name === "正式环境")
          const defaultEnv = productionEnv || envList[0]
          setCurrentEnvironment(currentParams.id, defaultEnv.id)
        }
      }
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
