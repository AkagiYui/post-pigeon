// 项目环境设置组件
// 在项目设置中管理环境（创建、编辑、删除）及每个环境下的模块前置 URL 和环境变量
import {
  createSortable,
  DragDropProvider,
  DragDropSensors,
  type DragEvent,
  SortableProvider,
  transformStyle,
} from "@thisbeyond/solid-dnd"
import { CircleMinus, CircleX, Eye, EyeOff, GripVertical, Key, Link2, Plus, Trash2, TriangleAlert, X } from "lucide-solid"
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"

import type { Environment, Module } from "@/../bindings/post-pigeon/internal/models/models"
import { EnvironmentVariable } from "@/../bindings/post-pigeon/internal/models/models"
import { EnvironmentService, ModuleService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { notifyBaseUrlsChanged, setProjectEnvironmentsList } from "@/stores/app"

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
                  title={pendingDeleteEnvId() === env.id ? t("common.confirmDelete") : t("common.delete")}
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
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-1">
        <Show
          when={selectedEnvId()}
          fallback={
            <div class="flex items-center justify-center h-full text-sm text-muted-foreground">
              {t("environment.selectToEdit")}
            </div>
          }
        >
          <EnvironmentDetailEditor
            projectId={props.projectId!}
            environmentId={selectedEnvId()!}
            onEnvSaved={loadEnvironments}
          />
        </Show>
      </div>
    </div>
  )
}

/**
 * EditorSaveRef 子编辑器暴露给父级的保存接口
 */
interface EditorSaveRef {
  save: () => Promise<void>
  hasUnsavedChanges: () => boolean
}

/**
 * EnvironmentDetailEditor 环境详情编辑器
 * 包含环境名称、模块前置 URL 和环境变量三个部分
 * 使用统一保存按钮，只保存有脏数据的部分
 */
function EnvironmentDetailEditor(props: { projectId: string; environmentId: string; onEnvSaved?: () => Promise<void> }) {
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
      console.error("保存环境设置失败", e)
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
  // 存储每个模块在当前环境下的 base URL，key 为 moduleId
  const [baseUrls, setBaseUrls] = createSignal<Record<string, string>>({})
  // 保存加载时的原始数据，用于判断是否有未保存的更改
  const [originalBaseUrls, setOriginalBaseUrls] = createSignal<Record<string, string>>({})
  const [loading, setLoading] = createSignal(false)

  // 判断是否有未保存的更改
  const hasUnsavedChanges = () => {
    const current = baseUrls()
    const original = originalBaseUrls()
    const allKeys = new Set([...Object.keys(current), ...Object.keys(original)])
    for (const key of allKeys) {
      if ((current[key] || "") !== (original[key] || "")) return true
    }
    return false
  }

  // 保存所有前置 URL
  const handleSave = async () => {
    const urlMap = baseUrls()
    await Promise.all(
      Object.entries(urlMap).map(([moduleId, url]) =>
        ModuleService.SetModuleBaseURL(moduleId, props.environmentId, url),
      ),
    )
    // 保存成功后更新原始快照
    setOriginalBaseUrls({ ...urlMap })
    // 通知其他组件 baseUrl 已变更
    notifyBaseUrlsChanged()
  }

  // 将接口暴露给父级
  props.ref.save = handleSave
  props.ref.hasUnsavedChanges = hasUnsavedChanges

  // 加载所有模块及其在当前环境下的前置 URL
  const loadData = async () => {
    try {
      setLoading(true)
      // 先获取项目下所有模块
      const moduleList = await ModuleService.ListModules(props.projectId)
      setModules(moduleList || [])

      if (!moduleList || moduleList.length === 0) {
        setBaseUrls({})
        setOriginalBaseUrls({})
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
      setOriginalBaseUrls({ ...urlMap })
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

  return (
    <div>
      <div class="flex items-center gap-1.5 mb-2">
        <Link2 class="h-4 w-4 text-muted-foreground" />
        <label class="text-sm font-medium text-foreground">{t("environment.baseUrl")}</label>
        {loading() && <span class="text-xs text-muted-foreground ml-1">{t("common.loading")}</span>}
      </div>
      <div class="space-y-1.5">
        <For each={modules()}>
          {(mod) => (
            <div class="flex items-center gap-2">
              <span class="text-sm text-foreground w-28 shrink-0 truncate" title={mod.name}>
                {mod.name}
              </span>
              <div class="flex-1">
                <Input
                  size="sm"
                  value={baseUrls()[mod.id] || ""}
                  onInput={(e) => setBaseUrls(prev => ({ ...prev, [mod.id]: e.currentTarget.value }))}
                  placeholder="https://api.example.com"
                />
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
 * EnvironmentVariablesEditor 环境变量编辑器（表格模式）
 *
 * 通过 ref 暴露 save() 和 hasUnsavedChanges() 供父级统一保存。
 *
 * 特性：
 * - 表格形式展示，一行一个环境变量
 * - 拖拽锚点排序（使用 solid-dnd）
 * - 开关切换启用/禁用
 * - 同名变量警告（启用状态下，非最后一个生效的同名变量显示警告）
 * - 两步确认删除（点击变红叉，3 秒内再点确认删除）
 * - 末尾始终有一个空行供快速输入新变量
 * - 修改后显示未保存提示
 */
function EnvironmentVariablesEditor(props: { ref: EditorSaveRef; environmentId: string }) {
  // 从服务器加载的原始变量（用于脏检测对比）
  const [savedVariables, setSavedVariables] = createSignal<EnvironmentVariable[]>([])
  // 当前编辑中的变量列表（使用 createStore 保持对象引用稳定，避免输入时丢失焦点）
  const [variables, setVariables] = createStore<EnvironmentVariable[]>([])
  // 草稿行（末尾空行）的独立状态，避免输入时 DOM 重新渲染导致焦点丢失
  const [draftKey, setDraftKey] = createSignal("")
  const [draftValue, setDraftValue] = createSignal("")
  const [draftDescription, setDraftDescription] = createSignal("")
  const [draftEnabled, setDraftEnabled] = createSignal(true)
  const [draftIsSecret, setDraftIsSecret] = createSignal(false)
  // 待确认删除的变量 ID（两步确认）
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(null)
  let deleteTimeout: ReturnType<typeof setTimeout> | null = null

  // 列宽值（用作 CSS flex-grow，拖拽时 1:1 跟手）
  const [columnWidths, setColumnWidths] = createSignal<Record<string, number>>({
    key: 1,
    value: 1,
    description: 1,
  })
  // 当前正在调整大小的列
  const [resizingCol, setResizingCol] = createSignal<string | null>(null)
  // 各列最小宽度（也对应最小 flex-grow 值）
  const COLUMN_MIN_WIDTHS: Record<string, number> = { key: 80, value: 80, description: 80 }

  onCleanup(() => {
    if (deleteTimeout) clearTimeout(deleteTimeout)
  })

  // 加载环境变量
  const loadVariables = async () => {
    try {
      const vars = await EnvironmentService.GetEnvironmentVariables(props.environmentId)
      // 转为普通对象，以便 createStore 深度追踪属性变化
      const list = (vars || []).map(v => ({ ...v }))
      setVariables(list)
      // 深拷贝保存原始快照，用于脏检测
      setSavedVariables(JSON.parse(JSON.stringify(list)))
      // 清空草稿行
      setDraftKey("")
      setDraftValue("")
      setDraftDescription("")
      setDraftEnabled(true)
      setDraftIsSecret(false)
    } catch (e) {
      console.error("加载环境变量失败", e)
    }
  }

  createEffect(on(
    () => props.environmentId,
    () => { loadVariables() },
  ))

  // 脏检测：比较当前变量 + 草稿行是否与已保存的不同
  const hasUnsavedChanges = createMemo(() => {
    const saved = savedVariables()
    const current = variables

    // 如果数量不同（排除空 key 的差异），视为有变化
    // 比较当前变量列表与已保存列表
    if (current.length !== saved.length) return true

    for (let i = 0; i < current.length; i++) {
      const c = current[i]
      const s = saved[i]
      if (
        c.id !== s.id ||
        c.key !== s.key ||
        c.value !== s.value ||
        c.description !== s.description ||
        c.enabled !== s.enabled ||
        c.sortOrder !== s.sortOrder ||
        c.isSecret !== s.isSecret
      ) return true
    }

    // 检查草稿行是否有内容
    if (draftKey().trim() !== "" || draftValue().trim() !== "" || draftDescription().trim() !== "") return true

    return false
  })

  // 同名变量警告映射：对于每个 key，只有最后一个启用的变量不警告
  const duplicateKeys = createMemo(() => {
    const vars = variables
    // 按 key 分组启用的变量，记录索引
    const keyToIndices = new Map<string, number[]>()
    for (let i = 0; i < vars.length; i++) {
      if (!vars[i].enabled) continue
      const k = vars[i].key.trim()
      if (!k) continue
      if (!keyToIndices.has(k)) keyToIndices.set(k, [])
      keyToIndices.get(k)!.push(i)
    }
    // 返回需要显示警告的索引集合（每个 key 组除最后一个外的所有索引）
    const warnIndices = new Set<number>()
    for (const indices of keyToIndices.values()) {
      if (indices.length > 1) {
        for (let j = 0; j < indices.length - 1; j++) {
          warnIndices.add(indices[j])
        }
      }
    }
    return warnIndices
  })

  // 将草稿行提升为正式变量（在失焦时触发）
  const promoteDraft = () => {
    const key = draftKey().trim()
    if (!key) return
    // 使用普通对象（兼容 createStore），按当前顺序设置 sortOrder
    const newVar: EnvironmentVariable = {
      id: "",
      environmentId: props.environmentId,
      key,
      value: draftValue(),
      description: draftDescription(),
      enabled: draftEnabled(),
      isSecret: draftIsSecret(),
      sortOrder: variables.length,
    }
    setVariables([...variables, newVar])
    // 清空草稿行
    setDraftKey("")
    setDraftValue("")
    setDraftDescription("")
    setDraftEnabled(true)
    setDraftIsSecret(false)
  }

  // 更新变量字段（使用 store 路径更新，保持对象引用稳定）
  const updateVariable = (index: number, field: keyof EnvironmentVariable, value: string | boolean) => {
    setVariables(index, field as any, value)
  }

  // 两步确认删除
  const handleDeleteConfirm = (varId: string) => {
    if (pendingDeleteId() === varId) {
      // 第二次点击，执行删除
      if (deleteTimeout) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }
      setPendingDeleteId(null)
      setVariables(variables.filter(v => v.id !== varId))
    } else {
      // 第一次点击，进入待确认状态
      if (deleteTimeout) clearTimeout(deleteTimeout)
      setPendingDeleteId(varId)
      deleteTimeout = setTimeout(() => {
        setPendingDeleteId(null)
        deleteTimeout = null
      }, 3000)
    }
  }

  // 保存变量（由父级统一调用）
  const handleSave = async () => {
    // 收集当前变量 + 草稿行（如果有内容）
    const currentVars = [...variables]
    if (draftKey().trim() !== "") {
      currentVars.push({
        id: "",
        environmentId: props.environmentId,
        key: draftKey().trim(),
        value: draftValue(),
        description: draftDescription(),
        enabled: draftEnabled(),
        isSecret: draftIsSecret(),
        sortOrder: currentVars.length,
      })
    }
    // 过滤掉空 key 的变量，按当前顺序更新 sortOrder
    const validVars = currentVars
      .filter(v => v.key.trim() !== "")
      .map((v, i) => ({ ...v, sortOrder: i }))
    await EnvironmentService.SaveEnvironmentVariables(props.environmentId, validVars as any)
    await loadVariables()
  }

  // 将接口暴露给父级
  props.ref.save = handleSave
  props.ref.hasUnsavedChanges = () => hasUnsavedChanges()

  // 拖拽结束后重新排列变量
  const handleDragEnd = (event: DragEvent) => {
    const { draggable, droppable } = event
    if (!droppable || draggable.id === droppable.id) return

    const currentVars = variables
    const oldIndex = currentVars.findIndex(v => v.id === draggable.id)
    const newIndex = currentVars.findIndex(v => v.id === droppable.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...currentVars]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    setVariables(reordered)
  }

  // 当前拖拽的变量 ID
  const [activeDragId, setActiveDragId] = createSignal<string | null>(null)
  const activeDragVar = createMemo(() => {
    const id = activeDragId()
    if (!id) return null
    return variables.find(v => v.id === id) ?? null
  })

  // 列拖拽调整宽度（存像素值用作 CSS flex-grow，鼠标 1:1 跟手）
  const handleResizeStart = (col: string, e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths()[col]
    setResizingCol(col)

    const onMouseMove = (moveE: MouseEvent) => {
      const delta = moveE.clientX - startX
      const newWidth = Math.max(COLUMN_MIN_WIDTHS[col], startWidth + delta)
      setColumnWidths(prev => ({ ...prev, [col]: Math.round(newWidth) }))
    }

    const onMouseUp = () => {
      setResizingCol(null)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  return (
    <div class="space-y-3">
      {/* 表头 + 未保存提示 */}
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-foreground">{t("environment.variables")}</label>
        <Show when={hasUnsavedChanges()}>
          <span class="text-xs text-amber-500 font-medium">{t("environment.variable.unsavedChanges")}</span>
        </Show>
      </div>

      {/* 表格容器 */}
      <div class="border border-border rounded-md overflow-hidden">
        {/* 表头行 */}
        <div class="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium select-none">
          {/* 拖拽锚点列 */}
          <div class="w-6 shrink-0" />
          {/* 开关列 */}
          <div class="w-10 shrink-0 text-center">{t("common.enabled")}</div>
          {/* 变量名列 — 可拖拽调宽 */}
          <ResizableHeader
            label={t("environment.variable.key")}
            width={columnWidths().key}
            minWidth={COLUMN_MIN_WIDTHS.key}
            isResizing={resizingCol() === "key"}
            onResizeStart={(e) => handleResizeStart("key", e)}
          />
          {/* 变量值列 — 可拖拽调宽 */}
          <ResizableHeader
            label={t("environment.variable.value")}
            width={columnWidths().value}
            minWidth={COLUMN_MIN_WIDTHS.value}
            isResizing={resizingCol() === "value"}
            onResizeStart={(e) => handleResizeStart("value", e)}
          />
          {/* 描述列 — 可拖拽调宽 */}
          <ResizableHeader
            label={t("environment.variable.description")}
            width={columnWidths().description}
            minWidth={COLUMN_MIN_WIDTHS.description}
            isResizing={resizingCol() === "description"}
            onResizeStart={(e) => handleResizeStart("description", e)}
          />
          {/* 删除按钮列 */}
          <div class="w-8 shrink-0" />
        </div>

        {/* 变量行（可拖拽排序） */}
        <DragDropProvider onDragStart={(e) => setActiveDragId(e.draggable.id as string)} onDragEnd={handleDragEnd}>
          <DragDropSensors />
          <SortableProvider ids={variables.map(v => v.id)}>
            <For each={variables}>
              {(variable, index) => (
                <SortableVariableRow
                  variable={variable}
                  index={index()}
                  isDuplicate={duplicateKeys().has(index())}
                  isPendingDelete={pendingDeleteId() === variable.id}
                  columnWidths={columnWidths()}
                  onUpdate={(field, value) => updateVariable(index(), field, value)}
                  onDelete={() => handleDeleteConfirm(variable.id)}
                />
              )}
            </For>
          </SortableProvider>
        </DragDropProvider>

        {/* 草稿行（末尾空行，不参与拖拽排序） */}
        <DraftVariableRow
          key_={draftKey()}
          value={draftValue()}
          description={draftDescription()}
          columnWidths={columnWidths()}
          onKeyChange={setDraftKey}
          onValueChange={setDraftValue}
          onDescriptionChange={setDraftDescription}
          onKeyBlur={promoteDraft}
        />

        {/* 无数据时不显示提示，仅保留草稿行供输入 */}
      </div>

    </div>
  )
}

/**
 * ResizableHeader 可拖拽调整宽度的表头单元格
 * 存存储像素值用作 CSS flex-grow，按比例分配空间，min-width 保证不被挤没
 */
function ResizableHeader(props: {
  label: string
  width: number
  minWidth: number
  isResizing: boolean
  onResizeStart: (e: MouseEvent) => void
}) {
  return (
    <div
      class="relative overflow-hidden"
      style={`flex: ${props.width} 1 0%; min-width: ${props.minWidth}px`}
    >
      <span class="truncate block">{props.label}</span>
      {/* 拖拽调整权重的手柄 */}
      <div
        class={cn(
          "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize transition-colors",
          props.isResizing
            ? "bg-accent"
            : "bg-transparent hover:bg-accent/30",
        )}
        onMouseDown={props.onResizeStart}
      />
    </div>
  )
}

/**
 * SortableVariableRow 可拖拽排序的变量行
 */
function SortableVariableRow(props: {
  variable: EnvironmentVariable
  index: number
  isDuplicate: boolean
  isPendingDelete: boolean
  columnWidths: Record<string, number>
  onUpdate: (field: keyof EnvironmentVariable, value: string | boolean) => void
  onDelete: () => void
}) {
  const sortable = createSortable(props.variable.id)
  // 控制密码是否显示明文
  const [showValue, setShowValue] = createSignal(false)

  return (
    <div
      use:sortable={sortable}
      class={cn(
        "flex items-center gap-2 px-3 py-1.5 border-b border-border/50 transition-colors overflow-hidden",
        sortable.isActiveDraggable
          ? "bg-accent-muted/50 shadow-sm z-10"
          : "bg-surface",
      )}
      style={{
        transition: sortable.isActiveDraggable
          ? "none"
          : "transform 150ms ease",
        ...transformStyle(sortable.transform),
      }}
    >
      {/* 拖拽锚点 */}
      <div
        class="flex items-center justify-center w-6 h-6 rounded shrink-0
                   text-muted-foreground/40 hover:text-muted-foreground
                   cursor-grab active:cursor-grabbing transition-colors"
        {...sortable.dragActivators}
      >
        <GripVertical class="h-3.5 w-3.5" />
      </div>

      {/* 开关 */}
      <div class="w-10 shrink-0 flex justify-center">
        <VariableToggle
          enabled={props.variable.enabled}
          onChange={(v) => props.onUpdate("enabled", v)}
        />
      </div>

      {/* 变量名 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.key} 1 0%; min-width: 80px`}
      >
        <div class="relative group">
          <Input
            size="sm"
            value={props.variable.key}
            onInput={(e) => props.onUpdate("key", e.currentTarget.value)}
            placeholder={t("environment.variable.key")}
            class={cn("pr-7", props.isDuplicate && "pr-10")}
          />
          {/* 输入框内部右侧图标区域 */}
          <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {/* 同名变量警告 — 始终在输入框内部显示 */}
            <Show when={props.isDuplicate}>
              <Tooltip content={t("environment.variable.duplicateWarning")}>
                <TriangleAlert class="h-3.5 w-3.5 text-amber-500 shrink-0" />
              </Tooltip>
            </Show>
            {/* 钥匙图标 — 仅鼠标悬停输入框时显示 */}
            <Tooltip content={props.variable.isSecret ? t("environment.variable.unsetSecret") : t("environment.variable.setSecret")}>
              <button
                class={cn(
                  "p-0.5 rounded transition-all",
                  "opacity-0 group-hover:opacity-100",
                  props.variable.isSecret
                    ? "opacity-100 text-amber-500 hover:text-amber-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => props.onUpdate("isSecret", !props.variable.isSecret)}
              >
                <Key class="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* 变量值 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.value} 1 0%; min-width: 80px`}
      >
        <div class="relative">
          <Input
            size="sm"
            type={props.variable.isSecret && !showValue() ? "password" : "text"}
            value={props.variable.value}
            onInput={(e) => props.onUpdate("value", e.currentTarget.value)}
            placeholder={t("environment.variable.value")}
            class={props.variable.isSecret ? "pr-8" : ""}
          />
          {/* 秘密变量时显示眼睛图标切换明文 */}
          <Show when={props.variable.isSecret}>
            <button
              class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowValue(p => !p)}
              title={showValue() ? t("common.hide") : t("common.show")}
            >
              {showValue() ? (
                <EyeOff class="h-3.5 w-3.5" />
              ) : (
                <Eye class="h-3.5 w-3.5" />
              )}
            </button>
          </Show>
        </div>
      </div>

      {/* 描述 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.description} 1 0%; min-width: 80px`}
      >
        <Input
          size="sm"
          value={props.variable.description || ""}
          onInput={(e) => props.onUpdate("description", e.currentTarget.value)}
          placeholder={t("environment.variable.description")}
        />
      </div>

      {/* 删除按钮（两步确认） */}
      <div class="w-8 shrink-0 flex justify-center">
        <button
          class={cn(
            "p-0.5 rounded transition-all",
            props.isPendingDelete
              ? "text-red-500"
              : "text-muted-foreground/40 hover:text-muted-foreground",
          )}
          onClick={props.onDelete}
          title={props.isPendingDelete ? t("common.confirmDelete") : t("common.delete")}
        >
          {props.isPendingDelete ? (
            <CircleX class="h-4 w-4" />
          ) : (
            <CircleMinus class="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * DraftVariableRow 草稿行（末尾空行）
 * 独立于变量列表，避免输入时因 DOM 重排导致焦点丢失
 */
function DraftVariableRow(props: {
  key_: string
  value: string
  description: string
  columnWidths: Record<string, number>
  onKeyChange: (v: string) => void
  onValueChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onKeyBlur: () => void
}) {
  return (
    <div class="flex items-center gap-2 px-3 py-1.5 bg-surface overflow-hidden">
      {/* 拖拽锚点占位（不可拖拽） */}
      <div class="w-6 shrink-0" />

      {/* 开关 — 空行隐藏 */}
      <div class="w-10 shrink-0" />

      {/* 变量名 — 空行隐藏钥匙图标 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.key} 1 0%; min-width: 80px`}
      >
        <Input
          size="sm"
          value={props.key_}
          onInput={(e) => props.onKeyChange(e.currentTarget.value)}
          onBlur={() => props.onKeyBlur()}
          placeholder={t("environment.variable.key")}
        />
      </div>

      {/* 变量值 — 空行显示普通输入 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.value} 1 0%; min-width: 80px`}
      >
        <Input
          size="sm"
          type="text"
          value={props.value}
          onInput={(e) => props.onValueChange(e.currentTarget.value)}
          placeholder={t("environment.variable.value")}
        />
      </div>

      {/* 描述 */}
      <div
        class="overflow-hidden"
        style={`flex: ${props.columnWidths.description} 1 0%; min-width: 80px`}
      >
        <Input
          size="sm"
          value={props.description}
          onInput={(e) => props.onDescriptionChange(e.currentTarget.value)}
          placeholder={t("environment.variable.description")}
        />
      </div>

      {/* 草稿行无删除按钮 */}
      <div class="w-8 shrink-0" />
    </div>
  )
}

/**
 * VariableToggle 开关切换组件
 * 使用纯 CSS 实现的无障碍 toggle switch
 */
function VariableToggle(props: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      class={cn(
        "relative inline-flex items-center",
        props.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        class="sr-only peer"
        checked={props.enabled}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <div class="w-8 h-4.5 bg-muted rounded-full peer-checked:bg-accent
                  peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30
                  transition-colors
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5
                  after:bg-white after:rounded-full after:h-3.5 after:w-3.5
                  after:transition-transform peer-checked:after:translate-x-3.5" />
    </label>
  )
}
