// 项目设置路由
// 使用左右分栏标签页，包含基本设置和环境设置
import { Icon } from "@iconify-icon/solid"
import { createFileRoute, useNavigate, useParams } from "@tanstack/solid-router"
import { createSignal, onMount, Show } from "solid-js"

import { ProjectService } from "@/../bindings/PostPigeon/internal/services"
import { CookieSettings } from "@/components/settings/CookieSettings"
import { GlobalVariablesSettings } from "@/components/settings/GlobalVariablesSettings"
import { ProjectEnvironmentSettings } from "@/components/settings/ProjectEnvironmentSettings"
import { ProxySettingsPanel } from "@/components/settings/ProxySettingsPanel"
import { ScriptLibrarySettings } from "@/components/settings/ScriptLibrarySettings"
import { TLSSettingsPanel } from "@/components/settings/TLSSettingsPanel"
import { URLEncodingSettings } from "@/components/settings/URLEncodingSettings"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { SideTabs } from "@/components/ui/tabs"
import { useHotkey } from "@/hooks/useHotkey"
import { t } from "@/hooks/useI18n"
import { useRouteCache } from "@/hooks/useRouteCache"
import { activeProjectId as storeActiveProjectId, closeProject, openProjectIds, setProjectNames } from "@/stores/app"
import { toastError, toastSuccess } from "@/stores/toast"

/**
 * 项目设置标签列表。
 * 只存图标名而不是 <Icon> 元素：JSX 在模块顶层求值会脱离 solid 的 owner 树
 * （节点永不释放），且元素是模块级单例，同一个 DOM 节点无法同时出现在两处。
 * 图标统一在 tabs() 里按需创建。
 */
const projectSettingsTabs = [
  { key: "basic", icon: "lucide:cog" },
  { key: "environment", icon: "lucide:globe" },
  { key: "globalVars", icon: "lucide:variable" },
  { key: "scriptLibrary", icon: "lucide:file-code" },
  { key: "proxy", icon: "lucide:network" },
  { key: "tls", icon: "lucide:shield-check" },
  { key: "urlEncoding", icon: "lucide:link" },
  { key: "cookies", icon: "lucide:cookie" },
]

function InheritedBooleanField(props: { label: string, value: boolean | null, onChange: (value: boolean | null) => void }) {
  return (
    <div>
      <label class="block text-sm font-medium text-foreground mb-1.5">{props.label}</label>
      <Select
        options={[
          { value: "inherit", label: t("inherit.global") },
          { value: "true", label: t("common.on") },
          { value: "false", label: t("common.off") },
        ]}
        value={props.value == null ? "inherit" : String(props.value)}
        onChange={(value) => props.onChange(value === "inherit" ? null : value === "true")}
        class="w-44"
      />
    </div>
  )
}

export const Route = createFileRoute("/project/$id/settings")({
  component: ProjectSettingsPage,
})

/**
 * 项目设置页面
 * 作为独立路由页面，包含基本设置和环境设置两个标签页
 */
function ProjectSettingsPage() {
  const params = useParams({ from: "/project/$id/settings" })
  const navigate = useNavigate()
  const projectId = () => params().id

  // ---- 路由状态缓存（自动保存/恢复） ----
  const cache = useRouteCache("settings")

  const [activeTab, setActiveTab] = cache.createCachedSignal("activeTab", "basic")
  const [name, setName] = cache.createCachedSignal("name", "")
  const [description, setDescription] = cache.createCachedSignal("description", "")
  const [wsProtocolConversion, setWSProtocolConversion] = cache.createCachedSignal("wsProtocolConversion", "inherit")
  const [timeoutMode, setTimeoutMode] = cache.createCachedSignal("timeoutMode", "inherit")
  const [timeout, setTimeout] = cache.createCachedSignal("timeout", 30000)
  const [followRedirects, setFollowRedirects] = cache.createCachedSignal<boolean | null>("followRedirects", null)
  const [sendNoCacheHeaders, setSendNoCacheHeaders] = cache.createCachedSignal<boolean | null>("sendNoCacheHeaders", null)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  // 已保存的原始值，用于判断表单是否发生变动
  const [savedName, setSavedName] = createSignal("")
  const [savedDescription, setSavedDescription] = createSignal("")
  const [savedWSProtocolConversion, setSavedWSProtocolConversion] = createSignal("inherit")
  const [savedRequestInheritance, setSavedRequestInheritance] = createSignal("")
  const requestInheritanceKey = () => JSON.stringify([timeoutMode(), timeout(), followRedirects(), sendNoCacheHeaders()])
  const isDirty = () => name().trim() !== savedName()
    || description().trim() !== savedDescription()
    || wsProtocolConversion() !== savedWSProtocolConversion()
	|| requestInheritanceKey() !== savedRequestInheritance()

  // ---- 克隆 / 删除（不进路由缓存：都是一次性的确认流程，离开页面就该重来） ----
  const [cloneOpen, setCloneOpen] = createSignal(false)
  const [cloneName, setCloneName] = createSignal("")
  const [cloning, setCloning] = createSignal(false)
  const [deleteOpen, setDeleteOpen] = createSignal(false)
  // 删除前要求把项目名原样敲一遍，避免误删；空名项目（加载失败时）一律不放行
  const [deleteInput, setDeleteInput] = createSignal("")
  const [deleting, setDeleting] = createSignal(false)
  const deleteNameMatched = () => savedName() !== "" && deleteInput().trim() === savedName()

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
        const wsMode = project.wsProtocolConversion || "inherit"
        const projectTimeoutMode = project.timeoutMode || "inherit"
        setSavedWSProtocolConversion(wsMode)
        setSavedRequestInheritance(JSON.stringify([projectTimeoutMode, project.timeout || 0, project.followRedirects, project.sendNoCacheHeaders]))
        if (!restoredFromCache) {
          setName(project.name || "")
          setDescription(project.description || "")
          setWSProtocolConversion(wsMode)
          setTimeoutMode(projectTimeoutMode)
          setTimeout(project.timeout || 0)
          setFollowRedirects(project.followRedirects)
          setSendNoCacheHeaders(project.sendNoCacheHeaders)
        }
      }
    } catch (e) {
      toastError(e, "error.op.loadFailed")
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
      await ProjectService.SaveProjectWSProtocolConversion(id, wsProtocolConversion())
      await ProjectService.SaveProjectRequestInheritance(id, timeoutMode(), timeout(), followRedirects(), sendNoCacheHeaders())
      // 更新缓存的项目名称
      setProjectNames(prev => ({ ...prev, [id]: trimmedName }))
      // 更新已保存值，使按钮回到禁用状态
      setName(trimmedName)
      setDescription(trimmedDescription)
      setSavedName(trimmedName)
      setSavedDescription(trimmedDescription)
      setSavedWSProtocolConversion(wsProtocolConversion())
      setSavedRequestInheritance(requestInheritanceKey())
    } catch (e) {
      toastError(e, "error.op.saveFailed")
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

  /** 打开克隆对话框，名称默认填「原名 + 副本」 */
  const openCloneDialog = () => {
    setCloneName(`${savedName()} ${t("project.clone.suffix")}`.trim())
    setCloneOpen(true)
  }

  /** 克隆项目：克隆件是独立的新项目，当前页面仍停在源项目上 */
  const handleClone = async () => {
    const id = projectId()
    const target = cloneName().trim()
    if (!id || !target || cloning()) return
    try {
      setCloning(true)
      const cloned = await ProjectService.CloneProject(id, target)
      setCloneOpen(false)
      if (cloned) toastSuccess(t("project.cloned", { name: cloned.name }))
    } catch (e) {
      toastError(e, "error.op.createFailed")
    } finally {
      setCloning(false)
    }
  }

  /** 打开删除对话框（每次都要求重新输入项目名） */
  const openDeleteDialog = () => {
    setDeleteInput("")
    setDeleteOpen(true)
  }

  /** 删除项目：顶栏上该项目的标签页一并关掉，再离开这个已不存在的项目 */
  const handleDelete = async () => {
    const id = projectId()
    if (!id || !deleteNameMatched() || deleting()) return
    const deletedName = savedName()
    try {
      setDeleting(true)
      await ProjectService.DeleteProject(id)
      setDeleteOpen(false)

      setProjectNames((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      // closeProject 会把激活项目顺移到下一个；顺移不到就只能回项目列表
      if (openProjectIds().includes(id)) closeProject(id)
      const nextId = storeActiveProjectId()
      if (nextId && nextId !== id) {
        navigate({ to: "/project/$id", params: { id: nextId } })
      } else {
        navigate({ to: "/" })
      }
      toastSuccess(t("project.deleted", { name: deletedName }))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    } finally {
      setDeleting(false)
    }
  }

  // 带国际化标签的 tab 列表
  const tabLabels: Record<string, string> = {
    basic: t("settings.general"),
    environment: t("environment.title"),
    globalVars: t("globalVar.title"),
    scriptLibrary: t("scriptLib.title"),
    proxy: t("proxy.title"),
    tls: t("settings.tls"),
    urlEncoding: t("urlEncoding.title"),
    cookies: t("settings.cookies"),
  }
  const tabs = () => projectSettingsTabs.map(tab => ({
    key: tab.key,
    label: tabLabels[tab.key] || tab.key,
    icon: <Icon icon={tab.icon} class="h-4 w-4" />,
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

                    {/* WebSocket 协议头自动转换 */}
                    <div>
                      <label class="block text-sm font-medium text-foreground mb-1.5">
                        {t("wsProtocol.title")}
                      </label>
                      <Select
                        options={[
                          { value: "inherit", label: t("wsProtocol.inherit.global") },
                          { value: "on", label: t("wsProtocol.on") },
                          { value: "off", label: t("wsProtocol.off") },
                        ]}
                        value={wsProtocolConversion()}
                        onChange={setWSProtocolConversion}
                        class="w-64"
                      />
                      <p class="mt-1.5 text-xs text-muted-foreground">{t("wsProtocol.project.hint")}</p>
                    </div>

                    <div class="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                      <div>
                        <label class="block text-sm font-medium text-foreground mb-1.5">{t("request.timeout")}</label>
                        <div class="flex gap-2">
                          <Select options={[
                            { value: "inherit", label: t("inherit.global") },
                            { value: "value", label: t("request.timeout.value") },
                            { value: "unlimited", label: t("request.timeout.unlimited") },
                          ]} value={timeoutMode()} onChange={(value) => { setTimeoutMode(value); if (value === "value" && timeout() <= 0) setTimeout(30000) }} class="w-44" />
                          <Show when={timeoutMode() === "value"}>
                            <Input type="number" min="1" value={String(timeout())} onInput={(e) => setTimeout(Math.max(1, Number(e.currentTarget.value) || 1))} class="w-32" />
                          </Show>
                        </div>
                      </div>
                      <InheritedBooleanField label={t("request.followRedirects")} value={followRedirects()} onChange={setFollowRedirects} />
                      <InheritedBooleanField label={t("request.noCache")} value={sendNoCacheHeaders()} onChange={setSendNoCacheHeaders} />
                    </div>

                    {/* 操作按钮 */}
                    <div class="flex justify-end gap-2 pt-2">
                      <Button variant="default" onClick={handleSave} disabled={saving() || !isDirty()}>
                        {saving() ? t("common.saving") : t("common.save")}
                      </Button>
                    </div>

                    {/* 克隆项目 */}
                    <div class="space-y-3 rounded-md border border-border p-3">
                      <div class="text-sm font-medium">{t("project.clone")}</div>
                      <p class="text-xs text-muted-foreground">{t("project.clone.hint")}</p>
                      <Button size="sm" variant="outline" onClick={openCloneDialog}>
                        <Icon icon="lucide:copy" class="h-3.5 w-3.5" />
                        {t("project.clone")}
                      </Button>
                    </div>

                    {/* 删除项目 */}
                    <div class="space-y-3 rounded-md border border-red-500/40 p-3">
                      <div class="text-sm font-medium text-red-500">{t("project.dangerZone")}</div>
                      <p class="text-xs text-muted-foreground">{t("project.delete.hint")}</p>
                      <Button size="sm" variant="destructive" onClick={openDeleteDialog}>
                        <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
                        {t("project.delete")}
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
              case "globalVars":
                return (
                  <div class="h-full">
                    <GlobalVariablesSettings projectId={projectId()} />
                  </div>
                )
              case "scriptLibrary":
                return (
                  <div class="h-full">
                    <ScriptLibrarySettings projectId={projectId()} />
                  </div>
                )
              case "proxy":
                return (
                  <div class="h-full p-6">
                    <ProxySettingsPanel scope="project" projectId={projectId()} />
                  </div>
                )
              case "tls":
                return (
                  <div class="h-full p-6">
                    <TLSSettingsPanel scope="project" projectId={projectId()} />
                  </div>
                )
              case "urlEncoding":
                return (
                  <div class="h-full p-6">
                    <URLEncodingSettings projectId={projectId()} />
                  </div>
                )
              case "cookies":
                return (
                  <div class="h-full p-6">
                    <CookieSettings projectId={projectId()} />
                  </div>
                )
              default:
                return null
            }
          }}
        </SideTabs>
      </div>

      {/* 克隆项目：只问一个新名字，其余内容原样复制 */}
      <Dialog
        open={cloneOpen()}
        onClose={() => setCloneOpen(false)}
        title={t("project.clone")}
        closeOnEsc
        closeOnOverlayClick
      >
        <div class="p-6 space-y-4">
          <p class="text-sm text-muted-foreground select-text cursor-text">{t("project.clone.hint")}</p>
          <div>
            <label class="block text-sm font-medium mb-1.5">{t("project.clone.newName")}</label>
            <Input
              value={cloneName()}
              onInput={(e) => setCloneName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClone()}
              placeholder={t("project.name")}
              disabled={cloning()}
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCloneOpen(false)} disabled={cloning()}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleClone} disabled={cloning() || !cloneName().trim()}>
              {cloning() ? t("project.cloning") : t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 删除项目：把项目名原样敲一遍才放行 */}
      <Dialog
        open={deleteOpen()}
        onClose={() => setDeleteOpen(false)}
        title={t("project.delete")}
        closeOnEsc
        closeOnOverlayClick
      >
        {/* 整块提示文本可选中复制：要照着敲的名字就在里面，不让选等于让人手抄 */}
        <div class="p-6 space-y-4 select-text cursor-text">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:triangle-alert" class="h-5 w-5 text-red-500" />
            </div>
            <div class="flex-1 space-y-2">
              <p class="text-foreground">{t("project.delete.hint")}</p>
              {/* 能走到项目设置页，这个项目必然开在顶栏上，标签页一定会被关掉 */}
              <p class="text-sm text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                <Icon icon="lucide:triangle-alert" class="h-3.5 w-3.5 shrink-0" />
                {t("project.openTabWillClose")}
              </p>
            </div>
          </div>

          <div class="space-y-1.5">
            <p class="text-sm text-muted-foreground">{t("project.delete.typeName")}</p>
            <p class="rounded-md bg-muted px-2 py-1 font-mono text-sm break-all">{savedName()}</p>
            <Input
              value={deleteInput()}
              onInput={(e) => setDeleteInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder={t("project.name")}
              disabled={deleting()}
            />
            <Show when={deleteInput().trim() !== "" && !deleteNameMatched()}>
              <p class="text-xs text-red-500">{t("project.delete.nameMismatch")}</p>
            </Show>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting()}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting() || !deleteNameMatched()}>
              {deleting() ? t("common.deleting") : t("project.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
