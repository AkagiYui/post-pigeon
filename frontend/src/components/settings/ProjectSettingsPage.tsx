// 项目设置页面组件
// 使用左右分栏标签页，包含基本设置和环境设置
import { useParams, useRouter } from "@tanstack/solid-router"
import { Cog, Globe } from "lucide-solid"
import { createSignal, onMount } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SideTabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"
import { useRouteCache } from "@/hooks/useRouteCache"
import { setProjectNames } from "@/stores/app"

import { ProjectEnvironmentSettings } from "./ProjectEnvironmentSettings"

/** 项目设置标签列表 */
const projectSettingsTabs = [
  { key: "basic", label: "", icon: <Cog class="h-4 w-4" /> }, // label 在渲染时由 i18n 填充
  { key: "environment", label: "", icon: <Globe class="h-4 w-4" /> },
]

/**
 * ProjectSettingsPage 项目设置页面
 * 作为独立路由页面，包含基本设置和环境设置两个标签页
 */
export function ProjectSettingsPage() {
  const params = useParams({ from: "/project/$id/settings" })
  const router = useRouter()
  const projectId = () => params().id

  // ---- 路由状态缓存（自动保存/恢复） ----
  const cache = useRouteCache("settings")

  const [activeTab, setActiveTab] = cache.createCachedSignal("activeTab", "basic")
  const [name, setName] = cache.createCachedSignal("name", "")
  const [description, setDescription] = cache.createCachedSignal("description", "")
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")

  // 初始加载：优先恢复缓存，否则从后端获取
  onMount(async () => {
    if (!cache.loadAll()) {
      try {
        const id = projectId()
        if (!id) return
        const project = await ProjectService.GetProject(id)
        if (project) {
          setName(project.name || "")
          setDescription(project.description || "")
        }
      } catch (e) {
        console.error("加载项目信息失败", e)
        setError(t("project.loadFailed"))
      }
    }
  })
  // 组件卸载时自动保存所有注册的缓存状态
  cache.autoSaveAll()

  /** 保存项目设置 */
  const handleSave = async () => {
    const id = projectId()
    if (!id) return
    if (!name().trim()) {
      setError(t("project.nameRequired"))
      return
    }

    try {
      setSaving(true)
      setError("")
      await ProjectService.UpdateProject(id, name().trim(), description().trim())
      // 更新缓存的项目名称
      setProjectNames(prev => ({ ...prev, [id]: name().trim() }))
      // 保存成功后返回项目主页
      router.navigate({ to: "/project/$id", params: { id } })
    } catch (e) {
      console.error("保存项目设置失败", e)
      setError(t("project.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  // 带国际化标签的 tab 列表
  const tabs = () => projectSettingsTabs.map(tab => ({
    ...tab,
    // 基本设置 / 环境设置
    label: tab.key === "basic" ? t("settings.general") : t("environment.title"),
  }))

  return (
    <div class="flex flex-col h-full">
      {/* 主内容区 */}
      <div class="flex-1 overflow-hidden">
        <SideTabs
          tabs={tabs()}
          value={activeTab()}
          onChange={setActiveTab}
        >
          {(key) => {
            switch (key) {
              case "basic":
                return (
                  <div class="p-6 space-y-4">
                    {/* 错误提示 */}
                    {error() && (
                      <div class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">
                        {error()}
                      </div>
                    )}

                    {/* 项目名称 */}
                    <div>
                      <label class="block text-sm font-medium text-foreground mb-1.5">
                        {t("project.name")}
                      </label>
                      <Input
                        value={name()}
                        onInput={(e) => setName(e.currentTarget.value)}
                        placeholder={t("project.name")}
                        disabled={saving()}
                      />
                    </div>

                    {/* 项目描述 */}
                    <div>
                      <label class="block text-sm font-medium text-foreground mb-1.5">
                        {t("project.description")}
                      </label>
                      <Input
                        value={description()}
                        onInput={(e) => setDescription(e.currentTarget.value)}
                        placeholder={t("project.description")}
                        disabled={saving()}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div class="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => router.navigate({ to: "/project/$id", params: { id: projectId() } })}
                        disabled={saving()}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button variant="default" onClick={handleSave} disabled={saving()}>
                        {saving() ? t("common.saving") : t("common.save")}
                      </Button>
                    </div>
                  </div>
                )
              case "environment":
                return (
                  <div class="h-full">
                    <ProjectEnvironmentSettings
                      projectId={projectId()}
                      createCachedSignal={cache.createCachedSignal}
                    />
                  </div>
                )
              default:
                return null
            }
          }}
        </SideTabs>
      </div>
    </div>
  )
}
