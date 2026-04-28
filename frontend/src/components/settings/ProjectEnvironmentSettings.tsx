// 项目环境设置组件
// 在项目设置中管理环境（创建、编辑、删除）及每个环境下的模块前置 URL 和环境变量
import { Link2, Plus, Trash2, X } from "lucide-solid"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"

import type { Environment, EnvironmentVariable, Module } from "@/../bindings/post-pigeon/internal/models/models"
import { EnvironmentService, ModuleService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { setProjectEnvironmentsList } from "@/stores/app"

export interface ProjectEnvironmentSettingsProps {
  /** 项目 ID */
  projectId: string | null
  /** 路由缓存工厂函数，用于持久化状态 */
  createCachedSignal?: <T>(key: string, initial: T) => [() => T, (v: T) => void]
}

/**
 * ProjectEnvironmentSettings 项目环境设置
 * 管理项目的环境列表及每个环境的变量
 */
export function ProjectEnvironmentSettings(props: ProjectEnvironmentSettingsProps) {
  const [environments, setEnvironments] = createSignal<Environment[]>([])
  const [loading, setLoading] = createSignal(false)
  // 使用路由缓存持久化当前选中的环境，切换页面后仍能恢复
  const useCachedSignal = props.createCachedSignal || createSignal
  const [selectedEnvId, setSelectedEnvId] = useCachedSignal<string | null>("selectedEnvId", null)
  const [newEnvName, setNewEnvName] = createSignal("")
  const [creating, setCreating] = createSignal(false)
  // 待确认删除的环境 ID（两步确认：先点 X 变垃圾桶，再点才删除）
  const [pendingDeleteEnvId, setPendingDeleteEnvId] = createSignal<string | null>(null)
  let deleteTimeout: ReturnType<typeof setTimeout> | null = null

  // 组件卸载时清理定时器
  onCleanup(() => {
    if (deleteTimeout) {
      clearTimeout(deleteTimeout)
    }
  })

  // 加载环境列表，若当前选中的环境不存在则回退到第一个
  const loadEnvironments = async () => {
    if (!props.projectId) return
    try {
      setLoading(true)
      const envs = await EnvironmentService.ListEnvironments(props.projectId)
      setEnvironments(envs || [])
      // 同步到全局 store，使顶栏环境选择器也能使用最新数据
      setProjectEnvironmentsList(props.projectId, envs || [])
      // 如果当前选中的环境 ID 不在列表中（首次加载、缓存恢复、或被删除），则回退到第一个
      if (envs && envs.length > 0) {
        const stillExists = envs.some(e => e.id === selectedEnvId())
        if (!stillExists) {
          setSelectedEnvId(envs[0].id)
        }
      }
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

  // 创建新环境，创建后自动选中
  const handleCreate = async () => {
    if (!props.projectId || !newEnvName().trim()) return
    try {
      setCreating(true)
      const newEnv = await EnvironmentService.CreateEnvironment(props.projectId, newEnvName().trim())
      if (!newEnv) {
        console.error("创建环境失败：返回空结果")
        return
      }
      setNewEnvName("")
      setSelectedEnvId(newEnv.id)
      await loadEnvironments()
    } catch (e) {
      console.error("创建环境失败", e)
    } finally {
      setCreating(false)
    }
  }

  // 两步确认删除：第一次点击显示垃圾桶图标，3 秒内再次点击则执行删除
  const handleDeleteConfirm = (envId: string) => {
    if (pendingDeleteEnvId() === envId) {
      // 第二次点击（3 秒内），执行删除
      if (deleteTimeout) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }
      setPendingDeleteEnvId(null)
      handleDelete(envId)
    } else {
      // 第一次点击，进入待确认状态
      if (deleteTimeout) {
        clearTimeout(deleteTimeout)
      }
      setPendingDeleteEnvId(envId)
      // 3 秒后自动重置待确认状态
      deleteTimeout = setTimeout(() => {
        setPendingDeleteEnvId(null)
        deleteTimeout = null
      }, 3000)
    }
  }

  // 删除环境，如果删除的是当前选中的环境则自动选择上一个
  const handleDelete = async (envId: string) => {
    try {
      // 如果删除的是当前选中的环境，先切换到上一个环境
      if (selectedEnvId() === envId) {
        const envs = environments()
        const currentIndex = envs.findIndex(e => e.id === envId)
        if (currentIndex > 0) {
          setSelectedEnvId(envs[currentIndex - 1].id)
        } else if (envs.length > 1) {
          // 如果是第一个环境，则选择下一个
          setSelectedEnvId(envs[1].id)
        } else {
          setSelectedEnvId(null)
        }
      }
      await EnvironmentService.DeleteEnvironment(envId)
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
                  class={cn(
                    "p-0.5 rounded hover:bg-muted/80 transition-all",
                    pendingDeleteEnvId() === env.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConfirm(env.id)
                  }}
                  title={pendingDeleteEnvId() === env.id ? "确认删除" : "删除"}
                >
                  {pendingDeleteEnvId() === env.id ? (
                    <Trash2 class="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <X class="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            )}
          </For>
          <Show when={environments().length === 0 && !loading()}>
            <p class="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
          </Show>
        </div>
      </div>

      {/* 右侧：环境详情编辑（环境名称 + 模块前置 URL + 环境变量） */}
      <div class="flex-1 overflow-y-auto px-1">
        <Show
          when={selectedEnvId()}
          fallback={
            <div class="flex items-center justify-center h-full text-sm text-muted-foreground">
              请选择一个环境进行编辑
            </div>
          }
        >
          <EnvironmentDetailEditor
            projectId={props.projectId!}
            environmentId={selectedEnvId()!}
          />
        </Show>
      </div>
    </div>
  )
}

/**
 * EnvironmentDetailEditor 环境详情编辑器
 * 包含环境名称、模块前置 URL 和环境变量三个部分
 */
function EnvironmentDetailEditor(props: { projectId: string; environmentId: string }) {
  const [envName, setEnvName] = createSignal("")

  // 加载环境名称
  const loadEnvName = async () => {
    try {
      const env = await EnvironmentService.GetEnvironment(props.environmentId)
      if (env) setEnvName(env.name || "")
    } catch (e) {
      console.error("加载环境名称失败", e)
    }
  }

  createEffect(on(() => props.environmentId, () => { loadEnvName() }))

  return (
    <div class="space-y-4">
      {/* 环境名称 */}
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">{t("environment.name")}</label>
        <Input
          value={envName()}
          onInput={(e) => {
            const newName = e.currentTarget.value
            setEnvName(newName)
            EnvironmentService.UpdateEnvironment(props.environmentId, newName).catch(console.error)
          }}
          placeholder={t("environment.name")}
        />
      </div>

      {/* 模块前置 URL 区域 */}
      <ModuleBaseUrlsEditor
        projectId={props.projectId}
        environmentId={props.environmentId}
      />

      {/* 分隔线 */}
      <hr class="border-border" />

      {/* 环境变量区域 */}
      <EnvironmentVariablesEditor environmentId={props.environmentId} />
    </div>
  )
}

/**
 * ModuleBaseUrlsEditor 模块前置 URL 编辑器
 * 展示项目下所有模块，为每个模块设置在当前环境下的前置 URL，失焦自动保存
 */
function ModuleBaseUrlsEditor(props: { projectId: string; environmentId: string }) {
  const [modules, setModules] = createSignal<Module[]>([])
  // 存储每个模块在当前环境下的 base URL，key 为 moduleId
  const [baseUrls, setBaseUrls] = createSignal<Record<string, string>>({})
  const [loading, setLoading] = createSignal(false)
  const [savingModuleId, setSavingModuleId] = createSignal<string | null>(null)

  // 加载所有模块及其在当前环境下的前置 URL
  const loadData = async () => {
    try {
      setLoading(true)
      // 先获取项目下所有模块
      const moduleList = await ModuleService.ListModules(props.projectId)
      setModules(moduleList || [])

      if (!moduleList || moduleList.length === 0) {
        setBaseUrls({})
        return
      }

      // 并行查询每个模块在当前环境下的前置 URL
      const resultPairs = await Promise.all(
        moduleList.map(async (m) => {
          const urls = await ModuleService.GetModuleBaseURLs(m.id)
          const matched = urls.find(u => u.environmentId === props.environmentId)
          return { moduleId: m.id, baseUrl: matched?.baseUrl ?? "" }
        }),
      )

      // 构建 moduleId -> baseUrl 映射
      const urlMap: Record<string, string> = {}
      for (const { moduleId, baseUrl } of resultPairs) {
        urlMap[moduleId] = baseUrl
      }
      setBaseUrls(urlMap)
    } catch (e) {
      console.error("加载模块前置 URL 失败", e)
    } finally {
      setLoading(false)
    }
  }

  // 环境切换时重新加载
  createEffect(on(
    () => props.environmentId,
    () => { loadData() },
  ))

  // 更新某个模块的 base URL（失焦时自动保存）
  const handleBlur = async (moduleId: string) => {
    const url = baseUrls()[moduleId] || ""
    try {
      setSavingModuleId(moduleId)
      await ModuleService.SetModuleBaseURL(moduleId, props.environmentId, url)
    } catch (e) {
      console.error("保存模块前置 URL 失败", e)
    } finally {
      setSavingModuleId(null)
    }
  }

  return (
    <div>
      <div class="flex items-center gap-1.5 mb-2">
        <Link2 class="h-4 w-4 text-muted-foreground" />
        <label class="text-sm font-medium text-foreground">{t("environment.baseUrl")}</label>
        {loading() && <span class="text-xs text-muted-foreground ml-1">加载中...</span>}
      </div>
      <div class="space-y-1.5">
        <For each={modules()}>
          {(mod) => (
            <div class="flex items-center gap-2">
              <span class="text-sm text-foreground w-28 shrink-0 truncate" title={mod.name}>
                {mod.name}
              </span>
              <div class="flex-1 relative">
                <Input
                  size="sm"
                  value={baseUrls()[mod.id] || ""}
                  onInput={(e) => setBaseUrls(prev => ({ ...prev, [mod.id]: e.currentTarget.value }))}
                  onBlur={() => handleBlur(mod.id)}
                  placeholder="https://api.example.com"
                />
                {/* 保存中的加载指示器 */}
                <Show when={savingModuleId() === mod.id}>
                  <div class="absolute right-2 top-1/2 -translate-y-1/2">
                    <span class="text-xs text-muted-foreground">保存中...</span>
                  </div>
                </Show>
              </div>
            </div>
          )}
        </For>
        <Show when={modules().length === 0 && !loading()}>
          <p class="text-xs text-muted-foreground pl-1">{t("common.noData")}</p>
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

  // 加载环境变量
  const loadVariables = async () => {
    try {
      const env = await EnvironmentService.GetEnvironment(props.environmentId)
      if (env) {
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
