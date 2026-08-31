// 项目环境设置组件
// 在项目设置中管理环境（创建、编辑、删除）及每个环境下的模块前置 URL 和环境变量
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"

import { ModuleBaseURL, ServerBaseURL } from "@/../bindings/PostPigeon/internal/models"
import type { Environment, Module } from "@/../bindings/PostPigeon/internal/models/models"
import { EnvironmentService, ModuleService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { notifyBaseUrlsChanged, setProjectEnvironmentsList } from "@/stores/app"
import { showToast, toastError } from "@/stores/toast"

import type { EditorSaveRef } from "./editor-save-ref"
import { EnvironmentVariablesEditor } from "./EnvironmentVariablesEditor"

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
      toastError(e, "error.op.loadFailed")
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
        showToast("error", t("error.op.createFailed"))
        return
      }
      setNewEnvName("")
      setSelectedEnvId(newEnv.id)
      await loadEnvironments()
    } catch (e) {
      toastError(e, "error.op.createFailed")
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
      toastError(e, "error.op.deleteFailed")
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
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
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
                  title={pendingDeleteEnvId() === env.id ? t("common.confirmDelete") : t("common.delete")}
                >
                  {pendingDeleteEnvId() === env.id ? (
                    <Icon icon="lucide:trash-2" class="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Icon icon="lucide:x" class="h-3.5 w-3.5 text-muted-foreground" />
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
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-1">
        <Show
          when={selectedEnvId()}
          keyed
          fallback={
            <div class="flex items-center justify-center h-full text-sm text-muted-foreground">
              {t("environment.selectToEdit")}
            </div>
          }
        >
          {environmentId => <EnvironmentDetailEditor
            projectId={props.projectId!}
            environmentId={environmentId}
            onEnvSaved={loadEnvironments}
          />}
        </Show>
      </div>
    </div>
  )
}


/**
 * EnvironmentDetailEditor 环境详情编辑器
 * 包含环境名称、模块前置 URL 和环境变量三个部分
 * 使用统一保存按钮，只保存有脏数据的部分
 */
export function EnvironmentDetailEditor(props: { projectId: string; environmentId: string; onEnvSaved?: () => Promise<void> }) {
  const [envName, setEnvName] = createSignal("")
  const [originalEnvName, setOriginalEnvName] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  // 子编辑器的 ref，用于访问其 save 和 hasUnsavedChanges
  const baseUrlsRef: EditorSaveRef = { save: async () => {}, hasUnsavedChanges: () => false }
  const envVarsRef: EditorSaveRef = { save: async () => {}, hasUnsavedChanges: () => false }

  // 计算是否有任意脏数据（环境名称 + 前置 URL + 环境变量）
  const hasUnsavedChanges = () =>
    envName() !== originalEnvName() ||
    baseUrlsRef.hasUnsavedChanges() ||
    envVarsRef.hasUnsavedChanges()

  // 统一保存：只保存有脏数据的部分
  const handleSave = async () => {
    try {
      setSaving(true)
      const promises: Promise<void>[] = []
      if (envName() !== originalEnvName()) {
        promises.push(EnvironmentService.UpdateEnvironment(props.environmentId, envName()))
      }
      if (baseUrlsRef.hasUnsavedChanges()) promises.push(baseUrlsRef.save())
      if (envVarsRef.hasUnsavedChanges()) promises.push(envVarsRef.save())
      await Promise.all(promises)
      // 保存成功后更新原始快照，并刷新父级环境列表（更新左侧列表和顶栏选择器）
      setOriginalEnvName(envName())
      await props.onEnvSaved?.()
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  // 加载环境名称
  const loadEnvName = async () => {
    try {
      const env = await EnvironmentService.GetEnvironment(props.environmentId)
      const name = env?.name ?? ""
      setEnvName(name)
      setOriginalEnvName(name)
    } catch (e) {
      toastError(e, "error.op.loadFailed")
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
          onInput={(e) => setEnvName(e.currentTarget.value)}
          placeholder={t("environment.name")}
        />
      </div>

      {/* 模块前置 URL 区域 */}
      <ModuleBaseUrlsEditor
        ref={baseUrlsRef}
        projectId={props.projectId}
        environmentId={props.environmentId}
      />

      {/* 分隔线 */}
      <hr class="border-border" />

      {/* 环境变量区域 */}
      <EnvironmentVariablesEditor
        ref={envVarsRef}
        environmentId={props.environmentId}
      />

      {/* 统一保存按钮 */}
      <div class="flex justify-end pt-2">
        <Button variant="default" size="sm" onClick={handleSave} disabled={saving() || !hasUnsavedChanges()}>
          {saving() ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  )
}

/**
 * ModuleBaseUrlsEditor 模块前置 URL 编辑器
 * 展示项目下所有模块，为每个模块设置在当前环境下的前置 URL
 * 通过 ref 暴露 save() 和 hasUnsavedChanges() 供父级统一保存
 */
function ModuleBaseUrlsEditor(props: { ref: EditorSaveRef; projectId: string; environmentId: string }) {
  const [modules, setModules] = createSignal<Module[]>([])
  const [rows, setRows] = createSignal<Record<string, ModuleBaseURL>>({})
  const [original, setOriginal] = createSignal("{}")
  const [loading, setLoading] = createSignal(false)
  let loadToken = 0
  onCleanup(() => { loadToken++ })

  const hasUnsavedChanges = () => !loading() && JSON.stringify(rows()) !== original()
  props.ref.hasUnsavedChanges = hasUnsavedChanges
  props.ref.save = async () => {
    const environmentId = props.environmentId
    const snapshot = rows()
    await ModuleService.SaveEnvironmentBaseURLs(environmentId, Object.values(snapshot))
    if (environmentId === props.environmentId) setOriginal(JSON.stringify(snapshot))
    notifyBaseUrlsChanged()
  }

  createEffect(on(() => [props.projectId, props.environmentId] as const, async ([projectId, environmentId]) => {
    const token = ++loadToken
    setLoading(true)
    setModules([])
    setRows({})
    setOriginal("{}")
    try {
      const moduleList = await ModuleService.ListModules(projectId) || []
      const entries = await Promise.all(moduleList.map(async mod => {
        const urls = await ModuleService.GetModuleBaseURLs(mod.id)
        return [mod.id, new ModuleBaseURL(urls.find(url => url.environmentId === environmentId) || { moduleId: mod.id, environmentId })] as const
      }))
      if (token !== loadToken) return
      const next = Object.fromEntries(entries)
      setRows(next)
      setOriginal(JSON.stringify(next))
      setModules(moduleList)
    } catch (error) {
      if (token === loadToken) toastError(error, "error.op.loadFailed")
    } finally {
      if (token === loadToken) setLoading(false)
    }
  }))

  const update = (moduleId: string, patch: Partial<ModuleBaseURL>) => {
    setRows(prev => ({ ...prev, [moduleId]: new ModuleBaseURL({ ...prev[moduleId], ...patch }) }))
  }
  const updateServer = (moduleId: string, serverId: string, patch: Partial<ServerBaseURL>) => {
    const urls = rows()[moduleId]?.serverUrls || {}
    update(moduleId, { serverUrls: { ...urls, [serverId]: new ServerBaseURL({ ...urls[serverId], ...patch }) } })
  }

  return (
    <div>
      <div class="flex items-center gap-1.5 mb-2">
        <Icon icon="lucide:link-2" class="h-4 w-4 text-muted-foreground" />
        <label class="text-sm font-medium text-foreground">{t("environment.baseUrl")}</label>
        <Show when={loading()}><span class="text-xs text-muted-foreground ml-1">{t("common.loading")}</span></Show>
      </div>
      <div class="space-y-4">
        <For each={modules()}>{mod => (
          <div class="rounded border border-border p-3 space-y-3">
            <div class="text-sm font-medium truncate" title={mod.name}>{mod.name}</div>
            <div class="space-y-2">
              <div class="text-xs text-muted-foreground">{t("server.default")}</div>
              <label class="flex items-center gap-2 text-xs"><span class="w-20 shrink-0">HTTP</span>
                <Input size="sm" value={rows()[mod.id]?.baseUrl || ""} onInput={e => update(mod.id, { baseUrl: e.currentTarget.value })} placeholder="https://api.example.com" />
              </label>
              <label class="flex items-center gap-2 text-xs"><span class="w-20 shrink-0">WebSocket</span>
                <Input size="sm" disabled={rows()[mod.id]?.websocketBaseUrl == null} value={rows()[mod.id]?.websocketBaseUrl ?? rows()[mod.id]?.baseUrl ?? ""} onInput={e => update(mod.id, { websocketBaseUrl: e.currentTarget.value })} placeholder="wss://api.example.com" />
              </label>
              <label class="flex items-center gap-2 text-xs text-muted-foreground ml-22">
                <input type="checkbox" checked={rows()[mod.id]?.websocketBaseUrl == null} onChange={e => update(mod.id, { websocketBaseUrl: e.currentTarget.checked ? null : rows()[mod.id]?.baseUrl || "" })} />
                {t("server.shareHTTP")}
              </label>
            </div>
            <For each={mod.servers || []}>{server => (
              <div class="space-y-2 border-t border-border pt-3">
                <div class="text-xs text-muted-foreground truncate" title={server.name}>{server.name}</div>
                <label class="flex items-center gap-2 text-xs"><span class="w-20 shrink-0">HTTP</span>
                  <Input size="sm" value={rows()[mod.id]?.serverUrls?.[server.id]?.http || ""} onInput={e => updateServer(mod.id, server.id, { http: e.currentTarget.value })} placeholder="https://api.example.com" />
                </label>
                <label class="flex items-center gap-2 text-xs"><span class="w-20 shrink-0">WebSocket</span>
                  <Input size="sm" value={rows()[mod.id]?.serverUrls?.[server.id]?.websocket || ""} onInput={e => updateServer(mod.id, server.id, { websocket: e.currentTarget.value })} placeholder="wss://api.example.com" />
                </label>
              </div>
            )}</For>
          </div>
        )}</For>
        <Show when={modules().length === 0 && !loading()}><p class="text-xs text-muted-foreground">{t("common.noData")}</p></Show>
      </div>
    </div>
  )
}
