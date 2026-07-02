// 项目设置路由
// 使用左右分栏标签页，包含基本设置和环境设置
import { createFileRoute, useParams } from "@tanstack/solid-router"
import { Cog, Globe } from "lucide-solid"
import { createSignal, onMount } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { ProjectEnvironmentSettings } from "@/components/settings/ProjectEnvironmentSettings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SideTabs } from "@/components/ui/tabs"
import { useHotkey } from "@/hooks/useHotkey"
import { t } from "@/hooks/useI18n"
import { useRouteCache } from "@/hooks/useRouteCache"
import { setProjectNames } from "@/stores/app"

/** 项目设置标签列表 */
const projectSettingsTabs = [
  { key: "basic", label: "", icon: <Cog class="h-4 w-4" /> }, // label 在渲染时由 i18n 填充
  { key: "environment", label: "", icon: <Globe class="h-4 w-4" /> },
]

export const Route = createFileRoute("/project/$id/settings")({
  component: ProjectSettingsPage,
})

/**
 * 项目设置页面
 * 作为独立路由页面，包含基本设置和环境设置两个标签页
 */
function ProjectSettingsPage() {
  const params = useParams({ from: "/project/$id/settings" })
  const projectId = () => params().id

  // ---- 路由状态缓存（自动保存/恢复） ----
  const cache = useRouteCache("settings")

  const [activeTab, setActiveTab] = cache.createCachedSignal("activeTab", "basic")
  const [name, setName] = cache.createCachedSignal("name", "")
  const [description, setDescription] = cache.createCachedSignal("description", "")
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  // 已保存的原始值，用于判断表单是否发生变动
  const [savedName, setSavedName] = createSignal("")
  const [savedDescription, setSavedDescription] = createSignal("")
  const isDirty = () => name().trim() !== savedName() || description().trim() !== savedDescription()

  // 初始加载：优先恢复缓存中的输入内容，但后端已保存值始终以接口返回为准（用于判断是否变动）
  onMount(async () => {
    const restoredFromCache = cache.loadAll()
    try {
      const id = projectId()
      if (!id) return
      const project = await ProjectService.GetProject(id)
      if (project) {
        setSavedName((project.name || "").trim())
        setSavedDescription((project.description || "").trim())
        if (!restoredFromCache) {
          setName(project.name || "")
          setDescription(project.description || "")
        }
      }
    } catch (e) {
      console.error("加载项目信息失败", e)
      setError(t("project.loadFailed"))
    }
  })
  // 组件卸载时自动保存所有注册的缓存状态
  cache.autoSaveAll()

  /** 保存项目设置（保存后停留在设置页，不自动跳转） */
  const handleSave = async () => {
    const id = projectId()
    if (!id) return
    if (!isDirty() || saving()) return
    if (!name().trim()) {
      setError(t("project.nameRequired"))
      return
    }

    try {
      setSaving(true)
      setError("")
      const trimmedName = name().trim()
      const trimmedDescription = description().trim()
      await ProjectService.UpdateProject(id, trimmedName, trimmedDescription)
      // 更新缓存的项目名称
      setProjectNames(prev => ({ ...prev, [id]: trimmedName }))
      // 更新已保存值，使按钮回到禁用状态
      setName(trimmedName)
      setDescription(trimmedDescription)
      setSavedName(trimmedName)
      setSavedDescription(trimmedDescription)
    } catch (e) {
      console.error("保存项目设置失败", e)
      setError(t("project.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  // 快捷键：CmdOrCtrl+S 保存基本设置（仅在基本设置标签页生效）
  useHotkey([
    {
      key: "CmdOrCtrl+S",
      allowInInput: true,
      handler: () => {
        if (activeTab() === "basic" && !saving()) handleSave()
      },
    },
  ])

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
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
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
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        placeholder={t("project.description")}
                        disabled={saving()}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div class="flex justify-end gap-2 pt-2">
                      <Button variant="default" onClick={handleSave} disabled={saving() || !isDirty()}>
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
