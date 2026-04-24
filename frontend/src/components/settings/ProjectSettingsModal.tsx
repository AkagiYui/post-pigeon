// 项目设置模态框组件
// 使用左右分栏标签页，包含基本设置和环境设置
import { Cog, Globe } from "lucide-solid"
import { createEffect, createSignal, on } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SideTabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"
import { setProjectNames } from "@/stores/app"

import { ProjectEnvironmentSettings } from "./ProjectEnvironmentSettings"

export interface ProjectSettingsModalProps {
  /** 是否显示 */
  open: boolean
  /** 当前项目 ID */
  projectId: string | null
  /** 关闭回调 */
  onClose: () => void
}

/** 项目设置标签列表 */
const projectSettingsTabs = [
  { key: "basic", label: "", icon: <Cog class="h-4 w-4" /> }, // label 在渲染时由 i18n 填充
  { key: "environment", label: "", icon: <Globe class="h-4 w-4" /> },
]

/**
 * ProjectSettingsModal 项目设置模态框
 * 与软件设置模态框结构一致，采用左右分栏标签页
 */
export function ProjectSettingsModal(props: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = createSignal("basic")
  const [name, setName] = createSignal("")
  const [description, setDescription] = createSignal("")
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")

  // 打开时加载项目数据
  createEffect(on(
    () => props.open && props.projectId,
    async () => {
      if (!props.projectId) return
      try {
        const project = await ProjectService.GetProject(props.projectId)
        if (project) {
          setName(project.name || "")
          setDescription(project.description || "")
        }
        setError("")
      } catch (e) {
        console.error("加载项目信息失败", e)
        setError("加载项目信息失败")
      }
    },
    { defer: true },
  ))

  /** 保存项目设置 */
  const handleSave = async () => {
    if (!props.projectId) return
    if (!name().trim()) {
      setError("项目名称不能为空")
      return
    }

    try {
      setSaving(true)
      setError("")
      await ProjectService.UpdateProject(props.projectId, name().trim(), description().trim())
      // 更新缓存的项目名称
      setProjectNames(prev => ({ ...prev, [props.projectId!]: name().trim() }))
      props.onClose()
    } catch (e) {
      console.error("保存项目设置失败", e)
      setError("保存项目设置失败")
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
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t("nav.projectSettings")}
      width="680px"
      height="70vh"
      closeOnEsc
    >
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
                    <Button variant="outline" onClick={props.onClose} disabled={saving()}>
                      {t("common.cancel")}
                    </Button>
                    <Button variant="default" onClick={handleSave} disabled={saving()}>
                      {saving() ? "保存中..." : t("common.save")}
                    </Button>
                  </div>
                </div>
              )
            case "environment":
              return (
                <div class="p-4">
                  <ProjectEnvironmentSettings projectId={props.projectId} />
                </div>
              )
            default:
              return null
          }
        }}
      </SideTabs>
    </Dialog>
  )
}
