// 项目环境设置组件
// 在项目设置中管理环境（创建、编辑、删除）及环境变量
import { Plus, Trash2 } from "lucide-solid"
import { createEffect, createSignal, For, on, Show } from "solid-js"

import type { Environment, EnvironmentVariable } from "@/../bindings/post-pigeon/internal/models/models"
import { EnvironmentService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { setProjectEnvironmentsList } from "@/stores/app"

export interface ProjectEnvironmentSettingsProps {
  /** 项目 ID */
  projectId: string | null
}

/**
 * ProjectEnvironmentSettings 项目环境设置
 * 管理项目的环境列表及每个环境的变量
 */
export function ProjectEnvironmentSettings(props: ProjectEnvironmentSettingsProps) {
  const [environments, setEnvironments] = createSignal<Environment[]>([])
  const [loading, setLoading] = createSignal(false)
  const [selectedEnvId, setSelectedEnvId] = createSignal<string | null>(null)
  const [newEnvName, setNewEnvName] = createSignal("")
  const [creating, setCreating] = createSignal(false)

  // 加载环境列表
  const loadEnvironments = async () => {
    if (!props.projectId) return
    try {
      setLoading(true)
      const envs = await EnvironmentService.ListEnvironments(props.projectId)
      setEnvironments(envs || [])
      // 同步到全局 store，使顶栏环境选择器也能使用最新数据
      setProjectEnvironmentsList(props.projectId, envs || [])
    } catch (e) {
      console.error("加载环境列表失败", e)
    } finally {
      setLoading(false)
    }
  }

  // 打开时加载环境列表
  createEffect(on(
    () => props.projectId,
    () => { loadEnvironments() },
  ))

  // 创建新环境
  const handleCreate = async () => {
    if (!props.projectId || !newEnvName().trim()) return
    try {
      setCreating(true)
      await EnvironmentService.CreateEnvironment(props.projectId, newEnvName().trim())
      setNewEnvName("")
      await loadEnvironments()
    } catch (e) {
      console.error("创建环境失败", e)
    } finally {
      setCreating(false)
    }
  }

  // 删除环境
  const handleDelete = async (envId: string) => {
    try {
      await EnvironmentService.DeleteEnvironment(envId)
      if (selectedEnvId() === envId) {
        setSelectedEnvId(null)
      }
      await loadEnvironments()
    } catch (e) {
      console.error("删除环境失败", e)
    }
  }

  return (
    <div class="flex h-full gap-4">
      {/* 左侧：环境列表 */}
      <div class="w-52 shrink-0 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <Input
            value={newEnvName()}
            onInput={(e) => setNewEnvName(e.currentTarget.value)}
            placeholder={t("environment.name")}
            size="sm"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleCreate}
            disabled={creating() || !newEnvName().trim()}
          >
            <Plus class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-1">
          <For each={environments()}>
            {(env) => (
              <div
                class={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer group transition-colors",
                  selectedEnvId() === env.id
                    ? "bg-accent-muted text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setSelectedEnvId(env.id)}
              >
                <span class="flex-1 truncate">{env.name}</span>
                <button
                  class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(env.id)
                  }}
                  title="删除"
                >
                  <Trash2 class="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            )}
          </For>
          <Show when={environments().length === 0 && !loading()}>
            <p class="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
          </Show>
        </div>
      </div>

      {/* 右侧：环境变量编辑 */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={selectedEnvId()}
          fallback={
            <div class="flex items-center justify-center h-full text-sm text-muted-foreground">
              请选择一个环境进行编辑
            </div>
          }
        >
          <EnvironmentVariablesEditor environmentId={selectedEnvId()!} />
        </Show>
      </div>
    </div>
  )
}

/**
 * EnvironmentVariablesEditor 环境变量编辑器
 * 管理单个环境的变量列表（键值对）
 */
function EnvironmentVariablesEditor(props: { environmentId: string }) {
  const [variables, setVariables] = createSignal<EnvironmentVariable[]>([])
  const [saving, setSaving] = createSignal(false)
  const [envName, setEnvName] = createSignal("")

  // 加载环境详情（包含变量）
  const loadVariables = async () => {
    try {
      const env = await EnvironmentService.GetEnvironment(props.environmentId)
      if (env) {
        setEnvName(env.name || "")
        setVariables(env.variables || [])
      }
    } catch (e) {
      console.error("加载环境变量失败", e)
    }
  }

  createEffect(on(
    () => props.environmentId,
    () => { loadVariables() },
  ))

  // 添加新变量
  const addVariable = () => {
    setVariables(prev => [
      ...prev,
      { environmentId: props.environmentId, key: "", value: "", description: "" } as EnvironmentVariable,
    ])
  }

  // 更新变量字段
  const updateVariable = (index: number, field: keyof EnvironmentVariable, value: string) => {
    setVariables(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }

  // 删除变量
  const removeVariable = (index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index))
  }

  // 保存变量
  const handleSave = async () => {
    try {
      setSaving(true)
      // 过滤掉键为空的变量
      const validVars = variables().filter(v => v.key.trim() !== "")
      await EnvironmentService.SaveEnvironmentVariables(props.environmentId, validVars as any)
      await loadVariables()
    } catch (e) {
      console.error("保存环境变量失败", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="space-y-3">
      {/* 环境名称 */}
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">{t("environment.name")}</label>
        <div class="flex items-center gap-2">
          <Input
            value={envName()}
            onInput={(e) => {
              const newName = e.currentTarget.value
              setEnvName(newName)
              EnvironmentService.UpdateEnvironment(props.environmentId, newName).catch(console.error)
            }}
          />
        </div>
      </div>

      {/* 环境变量列表 */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-foreground">{t("environment.variables")}</label>
          <Button variant="outline" size="sm" onClick={addVariable}>
            <Plus class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div class="space-y-2">
          <For each={variables()}>
            {(variable, index) => (
              <div class="flex items-start gap-2 p-2 rounded-md border border-border">
                <div class="flex-1 space-y-1">
                  <Input
                    value={variable.key}
                    onInput={(e) => updateVariable(index(), "key", e.currentTarget.value)}
                    placeholder="变量名"
                    size="sm"
                  />
                  <Input
                    value={variable.value}
                    onInput={(e) => updateVariable(index(), "value", e.currentTarget.value)}
                    placeholder="变量值"
                    size="sm"
                  />
                  <Input
                    value={variable.description || ""}
                    onInput={(e) => updateVariable(index(), "description", e.currentTarget.value)}
                    placeholder="描述（可选）"
                    size="sm"
                  />
                </div>
                <button
                  class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors mt-1"
                  onClick={() => removeVariable(index())}
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </For>
          <Show when={variables().length === 0}>
            <p class="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
          </Show>
        </div>
      </div>

      {/* 保存按钮 */}
      <div class="flex justify-end pt-1">
        <Button variant="default" size="sm" onClick={handleSave} disabled={saving()}>
          {saving() ? "保存中..." : t("common.save")}
        </Button>
      </div>
    </div>
  )
}
