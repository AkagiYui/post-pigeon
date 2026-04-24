// 项目设置模态框组件
// 允许编辑项目名称和描述
import { createEffect, createSignal, on } from "solid-js"

import { ProjectService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { setProjectNames } from "@/stores/app"

export interface ProjectSettingsModalProps {
  /** 是否显示 */
  open: boolean
  /** 当前项目 ID */
  projectId: string | null
  /** 关闭回调 */
  onClose: () => void
}

/**
 * ProjectSettingsModal 项目设置模态框
 * 用于编辑项目名称和描述等基本信息
 */
export function ProjectSettingsModal(props: ProjectSettingsModalProps) {
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

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t("nav.projectSettings")}
      width="480px"
      closeOnEsc
      closeOnOverlayClick
    >
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
            onClick={props.onClose}
            disabled={saving()}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={saving()}
          >
            {saving() ? "保存中..." : t("common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
