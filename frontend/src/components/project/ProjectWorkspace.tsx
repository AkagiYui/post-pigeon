// 项目工作区页面
// 包含接口管理、环境切换等核心功能
import { createSignal, onMount, Show } from 'solid-js'
import { useParams } from '@tanstack/solid-router'
import { t } from '@/hooks/useI18n'
import { ProjectService, ModuleService, EnvironmentService } from '@/../bindings/post-pigeon/internal/services'
import { ApiManagement } from '@/components/endpoint/ApiManagement'
import { cn } from '@/lib/utils'
import { setProjectEnvironmentsList, setCurrentEnvironment } from '@/stores/app'

export function ProjectWorkspace() {
    const params = useParams({ from: '/project/$id' })
    const [project, setProject] = createSignal<any>(null)
    const [modules, setModules] = createSignal<any[]>([])
    const [environments, setEnvironments] = createSignal<any[]>([])
    const [loading, setLoading] = createSignal(true)

    onMount(async () => {
        try {
            setLoading(true)
            // 在 SolidJS 中，params 是一个访问器函数，需要调用它
            const currentParams = params()
            console.log('路由参数:', currentParams)
            const proj = await ProjectService.GetProject(currentParams.id)
            if (!proj) {
                // 项目不存在，直接返回
                setLoading(false)
                return
            }
            setProject(proj)

            const [modList, envList] = await Promise.all([
                ModuleService.ListModules(currentParams.id),
                EnvironmentService.ListEnvironments(currentParams.id),
            ])
            setModules(modList || [])
            setEnvironments(envList || [])

            // 将环境列表存储到全局 store
            setProjectEnvironmentsList(currentParams.id, envList || [])

            // 设置默认环境
            if (envList && envList.length > 0) {
                setCurrentEnvironment(currentParams.id, envList[0].id)
            }
        } catch (e) {
            console.error('加载项目失败', e)
        } finally {
            setLoading(false)
        }
    })

    return (
        <Show
            when={!loading()}
            fallback={
                <div class="flex items-center justify-center h-full">
                    <p class="text-muted-foreground">{t('app.loading')}</p>
                </div>
            }
        >
            <Show
                when={project()}
                fallback={
                    <div class="flex items-center justify-center h-full">
                        <p class="text-muted-foreground">项目不存在</p>
                    </div>
                }
            >
                <ApiManagement
                    projectId={params().id}
                    modules={modules()}
                />
            </Show>
        </Show>
    )
}
