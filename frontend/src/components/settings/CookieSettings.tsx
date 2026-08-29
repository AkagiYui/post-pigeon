// 命名 Cookie 会话管理：模块默认私有，可按模块或单个环境显式共享/禁用。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js"

import type { CookieJar, Environment, Module, ModuleCookieBinding } from "@/../bindings/PostPigeon/internal/models/models"
import { StoredCookie } from "@/../bindings/PostPigeon/internal/models/models"
import { CookieService, EnvironmentService, ModuleService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, type SelectOption } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

export interface CookieSettingsProps {
  projectId: string
}

const INHERIT = "__cookie_inherit__"
const DISABLED = "__cookie_disabled__"

function emptyDraft(cookieJarId: string): StoredCookie {
  return new StoredCookie({ cookieJarId, domain: "", path: "/", name: "", value: "" })
}

export function CookieSettings(props: CookieSettingsProps) {
  const [jars, setJars] = createSignal<CookieJar[]>([])
  const [bindings, setBindings] = createSignal<ModuleCookieBinding[]>([])
  const [modules, setModules] = createSignal<Module[]>([])
  const [environments, setEnvironments] = createSignal<Environment[]>([])
  const [selectedJarId, setSelectedJarId] = createSignal("")
  const [cookies, setCookies] = createSignal<StoredCookie[]>([])
  const [draft, setDraft] = createSignal<StoredCookie>(emptyDraft(""))
  const [newJarName, setNewJarName] = createSignal("")
  const [saving, setSaving] = createSignal(false)
  const [savingBinding, setSavingBinding] = createSignal("")

  const loadCookies = async (jarId = selectedJarId()) => {
    if (!jarId) {
      setCookies([])
      return
    }
    try {
      setCookies((await CookieService.ListCookies(jarId)) || [])
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  const loadStructure = async () => {
    try {
      const [nextJars, nextBindings, nextModules, nextEnvironments] = await Promise.all([
        CookieService.ListCookieJars(props.projectId),
        CookieService.ListModuleCookieBindings(props.projectId),
        ModuleService.ListModules(props.projectId),
        EnvironmentService.ListEnvironments(props.projectId),
      ])
      setJars(nextJars || [])
      setBindings(nextBindings || [])
      setModules(nextModules || [])
      setEnvironments(nextEnvironments || [])
      const current = selectedJarId()
      setSelectedJarId(nextJars?.some(jar => jar.id === current) ? current : nextJars?.[0]?.id || "")
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  createEffect(on(() => props.projectId, () => {
    setSelectedJarId("")
    setNewJarName("")
    void loadStructure()
  }))

  createEffect(on(selectedJarId, (jarId) => {
    setDraft(emptyDraft(jarId))
    void loadCookies(jarId)
  }))

  const jarOptions = createMemo<SelectOption[]>(() => jars().map(jar => ({ value: jar.id, label: jar.name })))
  const bindingOptions = (allowInherit: boolean): SelectOption[] => [
    ...(allowInherit ? [{ value: INHERIT, label: t("cookie.binding.inherit") }] : []),
    { value: DISABLED, label: t("cookie.binding.disabled") },
    ...jarOptions(),
  ]

  const bindingFor = (moduleId: string, environmentId: string) =>
    bindings().find(binding => binding.moduleId === moduleId && binding.environmentId === environmentId)

  const bindingValue = (moduleId: string, environmentId: string) => {
    const binding = bindingFor(moduleId, environmentId)
    if (!binding) return environmentId ? INHERIT : DISABLED
    return binding.cookieJarId || DISABLED
  }

  const saveBinding = async (moduleId: string, environmentId: string, value: string) => {
    const key = `${moduleId}:${environmentId}`
    setSavingBinding(key)
    try {
      if (value === INHERIT) {
        await CookieService.ClearModuleCookieBinding(moduleId, environmentId)
      } else {
        await CookieService.SetModuleCookieBinding(moduleId, environmentId, value === DISABLED ? "" : value, value === DISABLED)
      }
      setBindings((await CookieService.ListModuleCookieBindings(props.projectId)) || [])
      toastSuccess(t("common.saved"))
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSavingBinding("")
    }
  }

  const createJar = async () => {
    const name = newJarName().trim()
    if (!name) return
    setSaving(true)
    try {
      const jar = await CookieService.CreateCookieJar(props.projectId, name)
      setNewJarName("")
      await loadStructure()
      if (jar) setSelectedJarId(jar.id)
      toastSuccess(t("cookie.jar.created"))
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  const selectedJarBindingCount = createMemo(() =>
    bindings().filter(binding => binding.cookieJarId === selectedJarId()).length)

  const deleteSelectedJar = async () => {
    const id = selectedJarId()
    if (!id || selectedJarBindingCount() > 0) return
    try {
      await CookieService.DeleteCookieJar(id)
      await loadStructure()
      toastSuccess(t("cookie.jar.deleted"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const addCookie = async () => {
    const item = draft()
    if (!selectedJarId() || !item.domain.trim() || !item.name.trim()) return
    setSaving(true)
    try {
      await CookieService.UpsertCookie(new StoredCookie({
        ...item,
        cookieJarId: selectedJarId(),
        path: item.path || "/",
      }))
      setDraft(emptyDraft(selectedJarId()))
      await loadCookies()
      toastSuccess(t("common.saved"))
    } catch (e) {
      toastError(e, "error.op.saveFailed")
    } finally {
      setSaving(false)
    }
  }

  const removeCookie = async (id: string) => {
    try {
      await CookieService.DeleteCookie(id)
      await loadCookies()
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const clearAll = async () => {
    if (!selectedJarId()) return
    try {
      await CookieService.ClearCookies(selectedJarId())
      await loadCookies()
      toastSuccess(t("cookie.cleared"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const pruneExpired = async () => {
    if (!selectedJarId()) return
    try {
      await CookieService.PruneExpiredCookies(selectedJarId())
      await loadCookies()
      toastSuccess(t("cookie.pruned"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const columns = () => [
    { header: t("cookie.domain"), field: "domain" as const, width: "22%" },
    { header: t("cookie.path"), field: "path" as const, width: "14%" },
    { header: t("common.name"), field: "name" as const, width: "18%" },
    {
      header: t("common.value"), width: "28%",
      render: (row: StoredCookie) => <span class="block truncate font-mono text-xs" title={row.value}>{row.value}</span>,
    },
    {
      header: t("cookie.expires"), width: "14%",
      render: (row: StoredCookie) => (
        <span class="text-xs text-muted-foreground">
          {row.expires ? new Date(row.expires).toLocaleString() : t("cookie.session")}
        </span>
      ),
    },
    {
      header: "", width: "4%",
      render: (row: StoredCookie) => (
        <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} onClick={() => removeCookie(row.id)}>
          <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div class="flex h-full flex-col gap-5 overflow-auto pr-1">
      <div>
        <h2 class="text-base font-medium">{t("cookie.title")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("cookie.hint")}</p>
      </div>

      <section class="rounded-md border border-border p-4">
        <h3 class="text-sm font-medium">{t("cookie.jar.title")}</h3>
        <p class="mt-1 text-xs text-muted-foreground">{t("cookie.jar.hint")}</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Select
            options={jarOptions()} value={selectedJarId()} onChange={setSelectedJarId}
            placeholder={t("cookie.jar.empty")} class="w-64" size="sm"
          />
          <Input
            size="sm" class="w-48" value={newJarName()} placeholder={t("cookie.jar.newName")}
            onInput={event => setNewJarName(event.currentTarget.value)}
            onKeyDown={event => { if (event.key === "Enter") void createJar() }}
          />
          <Button size="sm" onClick={createJar} disabled={saving() || !newJarName().trim()}>{t("common.add")}</Button>
          <Button
            size="sm" variant="outline" onClick={deleteSelectedJar}
            disabled={!selectedJarId() || selectedJarBindingCount() > 0}
            title={selectedJarBindingCount() > 0 ? t("cookie.jar.inUse") : t("common.delete")}
          >
            {t("common.delete")}
          </Button>
          <Show when={selectedJarBindingCount() > 0}>
            <span class="text-xs text-muted-foreground">{t("cookie.jar.bindingCount", { count: selectedJarBindingCount() })}</span>
          </Show>
        </div>
      </section>

      <section class="rounded-md border border-border p-4">
        <h3 class="text-sm font-medium">{t("cookie.binding.title")}</h3>
        <p class="mt-1 text-xs text-muted-foreground">{t("cookie.binding.hint")}</p>
        <div class="mt-3 divide-y divide-border">
          <For each={modules()}>
            {(module) => (
              <div class="py-3 first:pt-0 last:pb-0">
                <div class="flex items-center justify-between gap-3">
                  <span class="min-w-0 truncate text-sm font-medium">{module.name}</span>
                  <Select
                    options={bindingOptions(false)} value={bindingValue(module.id, "")}
                    onChange={value => void saveBinding(module.id, "", value)} size="sm" class="w-64"
                    disabled={savingBinding() === `${module.id}:`}
                    aria-label={t("cookie.binding.moduleDefault")}
                  />
                </div>
                <Show when={environments().length > 0}>
                  <div class="mt-2 space-y-1.5 border-l border-border pl-4">
                    <For each={environments()}>
                      {(environment) => (
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-xs text-muted-foreground">{environment.name}</span>
                          <Select
                            options={bindingOptions(true)} value={bindingValue(module.id, environment.id)}
                            onChange={value => void saveBinding(module.id, environment.id, value)}
                            size="xs" textSize="xs" class="w-64"
                            disabled={savingBinding() === `${module.id}:${environment.id}`}
                            aria-label={t("cookie.binding.environmentOverride")}
                          />
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </section>

      <section class="flex min-h-[260px] flex-col rounded-md border border-border p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-medium">{t("cookie.jar.cookies")}</h3>
            <p class="mt-1 text-xs text-muted-foreground">
              {jars().find(jar => jar.id === selectedJarId())?.name || t("cookie.jar.empty")}
            </p>
          </div>
        </div>

        <Show when={selectedJarId()} fallback={<p class="py-8 text-center text-sm text-muted-foreground">{t("cookie.jar.empty")}</p>}>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <Input size="sm" class="w-48" placeholder={t("cookie.domain")} value={draft().domain} onInput={e => setDraft(new StoredCookie({ ...draft(), domain: e.currentTarget.value }))} />
            <Input size="sm" class="w-24" placeholder={t("cookie.path")} value={draft().path} onInput={e => setDraft(new StoredCookie({ ...draft(), path: e.currentTarget.value }))} />
            <Input size="sm" class="w-32" placeholder={t("common.name")} value={draft().name} onInput={e => setDraft(new StoredCookie({ ...draft(), name: e.currentTarget.value }))} />
            <Input size="sm" class="w-48" placeholder={t("common.value")} value={draft().value} onInput={e => setDraft(new StoredCookie({ ...draft(), value: e.currentTarget.value }))} />
            <Button size="sm" onClick={addCookie} disabled={saving() || !draft().domain.trim() || !draft().name.trim()}>{t("common.add")}</Button>
          </div>

          <div class="mt-3 min-h-[160px] flex-1 overflow-auto">
            <Show when={cookies().length > 0} fallback={<p class="py-8 text-center text-sm text-muted-foreground">{t("cookie.empty")}</p>}>
              <Table columns={columns()} data={cookies()} compact />
            </Show>
          </div>

          <div class="mt-3 flex shrink-0 items-center gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={pruneExpired}>{t("cookie.pruneExpired")}</Button>
            <Button size="sm" variant="destructive" onClick={clearAll} disabled={cookies().length === 0}>{t("cookie.clearAll")}</Button>
          </div>
        </Show>
      </section>
    </div>
  )
}
