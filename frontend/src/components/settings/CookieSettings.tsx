// Cookie 管理面板（项目级）。
//
// 请求间的会话由持久化的 cookie jar 维持，这里提供查看、手工编辑与清空的入口——
// 「为什么这个接口一直 401」多半就是在这张表里能看出来。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, on, Show } from "solid-js"

import { StoredCookie } from "@/../bindings/PostPigeon/internal/models"
import { CookieService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

export interface CookieSettingsProps {
  projectId: string
}

/** 新建 cookie 的空表单 */
function emptyDraft(projectId: string): StoredCookie {
  return new StoredCookie({ projectId, domain: "", path: "/", name: "", value: "" })
}

export function CookieSettings(props: CookieSettingsProps) {
  const [cookies, setCookies] = createSignal<StoredCookie[]>([])
  const [draft, setDraft] = createSignal<StoredCookie>(emptyDraft(props.projectId))
  const [saving, setSaving] = createSignal(false)

  const load = async () => {
    try {
      const list = await CookieService.ListCookies(props.projectId)
      setCookies(list || [])
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  createEffect(on(() => props.projectId, () => {
    setDraft(emptyDraft(props.projectId))
    load()
  }))

  const addCookie = async () => {
    const item = draft()
    if (!item.domain.trim() || !item.name.trim()) return
    setSaving(true)
    try {
      await CookieService.UpsertCookie(new StoredCookie({ ...item, projectId: props.projectId, path: item.path || "/" }))
      setDraft(emptyDraft(props.projectId))
      await load()
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
      await load()
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const clearAll = async () => {
    try {
      await CookieService.ClearCookies(props.projectId)
      await load()
      toastSuccess(t("cookie.cleared"))
    } catch (e) {
      toastError(e, "error.op.deleteFailed")
    }
  }

  const pruneExpired = async () => {
    try {
      await CookieService.PruneExpiredCookies(props.projectId)
      await load()
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
      header: t("common.value"),
      width: "28%",
      render: (row: StoredCookie) => (
        <span class="block truncate font-mono text-xs" title={row.value}>{row.value}</span>
      ),
    },
    {
      header: t("cookie.expires"),
      width: "14%",
      render: (row: StoredCookie) => (
        <span class="text-xs text-muted-foreground">
          {row.expires ? new Date(row.expires).toLocaleString() : t("cookie.session")}
        </span>
      ),
    },
    {
      header: "",
      width: "4%",
      render: (row: StoredCookie) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.delete")}
          onClick={() => removeCookie(row.id)}
        >
          <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div class="flex h-full flex-col gap-4">
      <div>
        <h2 class="text-base font-medium">{t("cookie.title")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("cookie.hint")}</p>
      </div>

      {/* 新增一条 */}
      <div class="flex flex-wrap items-center gap-2">
        <Input
          size="sm" class="w-48" placeholder={t("cookie.domain")}
          value={draft().domain}
          onInput={(e) => setDraft(new StoredCookie({ ...draft(), domain: e.currentTarget.value }))}
        />
        <Input
          size="sm" class="w-24" placeholder={t("cookie.path")}
          value={draft().path}
          onInput={(e) => setDraft(new StoredCookie({ ...draft(), path: e.currentTarget.value }))}
        />
        <Input
          size="sm" class="w-32" placeholder={t("common.name")}
          value={draft().name}
          onInput={(e) => setDraft(new StoredCookie({ ...draft(), name: e.currentTarget.value }))}
        />
        <Input
          size="sm" class="w-48" placeholder={t("common.value")}
          value={draft().value}
          onInput={(e) => setDraft(new StoredCookie({ ...draft(), value: e.currentTarget.value }))}
        />
        <Button size="sm" onClick={addCookie} disabled={saving() || !draft().domain.trim() || !draft().name.trim()}>
          {t("common.add")}
        </Button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <Show
          when={cookies().length > 0}
          fallback={<p class="py-8 text-center text-sm text-muted-foreground">{t("cookie.empty")}</p>}
        >
          <Table columns={columns()} data={cookies()} compact />
        </Show>
      </div>

      <div class="flex shrink-0 items-center gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" onClick={pruneExpired}>{t("cookie.pruneExpired")}</Button>
        <Button size="sm" variant="destructive" onClick={clearAll} disabled={cookies().length === 0}>
          {t("cookie.clearAll")}
        </Button>
      </div>
    </div>
  )
}
