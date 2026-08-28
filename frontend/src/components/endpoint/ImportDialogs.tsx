// 四个导入对话框：OpenAPI / Apifox / cURL / Postman。
//
// 它们各自持有自己的预览、勾选与导入状态——留在 ApiManagement 里时，这些状态
// 一共占了主组件近三十个信号，把「接口管理」淹没在「导入向导」里。
// 主组件现在只需要知道「哪个框开着、内容是什么」。
import { createEffect, createSignal, For, on, Show } from "solid-js"

import type { ApifoxPreview, CurlRequest, OpenAPIPreview, PostmanPreview } from "@/../bindings/PostPigeon/internal/services"
import {
  ApifoxService,
  CurlService,
  ImportExportService,
  PostmanService,
} from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox, Radio } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

/** 勾选列表的「全选」复选框：半选状态需要在 ref 上手动同步 */
function SelectAllRow(props: {
  selected: Set<number>
  total: number
  onChange: (selectAll: boolean) => void
}) {
  return (
    <div class="shrink-0 flex items-center gap-2 text-xs text-muted-foreground px-1">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={props.selected.size === props.total && props.total > 0}
          ref={(el) => {
            createEffect(() => {
              el.indeterminate = props.selected.size > 0 && props.selected.size < props.total
            })
          }}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        <span>{t("openapi.selectAll")}</span>
      </label>
      <span>{t("openapi.selectedCount", { count: props.selected.size, total: props.total })}</span>
    </div>
  )
}

/** 切换集合中的一项，返回新集合（保持 Set 的不可变更新语义） */
function toggleIndex(current: Set<number>, index: number, checked: boolean): Set<number> {
  const next = new Set(current)
  if (checked) next.add(index)
  else next.delete(index)
  return next
}

// ---- OpenAPI ----

export interface OpenAPIImportDialogProps {
  open: boolean
  onClose: () => void
  /** 所属项目 */
  projectId: string
  /** 固定的导入目标模块（从模块菜单进入时）；不传则在对话框内选 */
  moduleId?: string
  /** 可选的已有模块（moduleId 未固定时用于「并入某个模块」） */
  modules?: { id: string; name: string }[]
  /** 已读取的文档内容 */
  json: string
  /** 导入成功后的回调（刷新树、环境等） */
  onImported: () => void | Promise<void>
}

export function OpenAPIImportDialog(props: OpenAPIImportDialogProps) {
  const [preview, setPreview] = createSignal<OpenAPIPreview | null>(null)
  const [selected, setSelected] = createSignal<Set<number>>(new Set())
  const [overwrite, setOverwrite] = createSignal(false)
  const [overwriteModuleName, setOverwriteModuleName] = createSignal(true)
  const [importServers, setImportServers] = createSignal(true)
  const [importing, setImporting] = createSignal(false)
  const [error, setError] = createSignal("")
  /** 导入目标模块；空串表示「新建模块」 */
  const [targetModuleId, setTargetModuleId] = createSignal("")
  const [newModuleName, setNewModuleName] = createSignal("")

  /** 目标模块可选时才显示选择器 */
  const canChooseModule = () => !props.moduleId

  const moduleOptions = () => [
    { value: "", label: t("openapi.target.newModule") },
    ...(props.modules ?? []).map(m => ({ value: m.id, label: m.name })),
  ]

  // 每次打开都回到干净状态；目标模块由调用方固定或默认「新建模块」
  createEffect(on(() => [props.open, props.json] as const, ([open, json]) => {
    if (!open || !json) return
    setOverwrite(false)
    setOverwriteModuleName(true)
    setImportServers(true)
    setNewModuleName("")
    setTargetModuleId(props.moduleId ?? "")
  }))

  // 换目标模块要重新预览：重复项是相对目标模块算出来的
  let previewSeq = 0
  createEffect(on(() => [props.open, props.json, targetModuleId()] as const, async ([open, json, moduleId]) => {
    if (!open || !json) return
    const seq = ++previewSeq
    setError("")
    setPreview(null)
    try {
      const result = await ImportExportService.PreviewOpenAPIForProject(props.projectId, moduleId, json)
      // 期间又换了一次目标模块，这次的结果已经过期
      if (seq !== previewSeq) return
      setPreview(result)
      // 默认全选
      setSelected(new Set((result?.items ?? []).map(item => item.index)))
    } catch (e) {
      if (seq !== previewSeq) return
      toastError(e, "error.op.previewFailed")
      setError(t("openapi.parseFailed"))
    }
  }))

  const confirm = async () => {
    if (!props.json) return
    setImporting(true)
    try {
      await ImportExportService.ImportOpenAPIToProject(props.projectId, props.json, {
        moduleId: targetModuleId(),
        newModuleName: newModuleName().trim(),
        overwrite: overwrite(),
        // 新建模块时名称已经定下来了，不该再被文档标题覆盖
        overwriteModuleName: !!targetModuleId() && overwriteModuleName(),
        importServers: importServers(),
        selectedIndexes: Array.from(selected()),
      })
      props.onClose()
      toastSuccess(t("importexport.imported"))
      await props.onImported()
    } catch (e) {
      toastError(e, "error.op.importFailed")
      setError(t("openapi.importFailed"))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("openapi.importTitle")} closeOnEsc closeOnOverlayClick width="560px">
      <div class="px-6 py-4 flex flex-col h-[70vh] gap-3">
        {/* 导入到哪儿：并入已有模块，还是新建一个 */}
        <Show when={canChooseModule()}>
          <div class="shrink-0 flex flex-col gap-2">
            <span class="text-xs font-medium text-muted-foreground">{t("openapi.target.label")}</span>
            <Select
              options={moduleOptions()}
              value={targetModuleId()}
              onChange={setTargetModuleId}
              size="sm"
            />
            <Show when={!targetModuleId()}>
              <Input
                size="sm"
                value={newModuleName()}
                onInput={(e) => setNewModuleName(e.currentTarget.value)}
                placeholder={preview()?.moduleName || t("openapi.target.newModuleName")}
              />
            </Show>
          </div>
        </Show>
        <Show when={error()}>
          <div class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md shrink-0">{error()}</div>
        </Show>
        <Show when={!error() && !preview()}>
          <div class="flex-1 flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>
        </Show>
        <Show when={preview()}>
          {(data) => (
            <>
              <div class="shrink-0 text-sm text-muted-foreground">
                {t("openapi.summary", { total: data().total, dup: data().duplicateCount })}
              </div>
              {/* 导入选项：模块名称、环境与前置 URL */}
              <div class="shrink-0 flex flex-col gap-2 border border-border rounded-md p-3">
                <Show when={!!targetModuleId() && data().moduleName && data().moduleName !== data().currentModuleName}>
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={overwriteModuleName()} onChange={(e) => setOverwriteModuleName(e.currentTarget.checked)} />
                    <span>{t("openapi.overwriteModuleName", { name: data().moduleName })}</span>
                  </label>
                </Show>
                <Show when={data().servers.length > 0}>
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={importServers()} onChange={(e) => setImportServers(e.currentTarget.checked)} />
                    <span>{t("openapi.importServers")}</span>
                  </label>
                  <div class="ml-6 flex flex-col gap-1">
                    <For each={data().servers}>
                      {(srv) => (
                        <div class="flex items-center gap-2 text-xs text-muted-foreground">
                          <span class="shrink-0 font-medium text-foreground">{srv.name || t("openapi.allEnvironments")}</span>
                          <span class="flex-1 min-w-0 truncate font-mono" title={srv.url}>{srv.url || "—"}</span>
                          <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted">
                            {srv.environmentSame ? t("openapi.envExists") : (srv.name ? t("openapi.envNew") : "")}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
                {/* 冲突处理方式（仅当存在重复项时） */}
                <Show when={data().duplicateCount > 0}>
                  <div class="flex flex-col gap-2 pt-1 border-t border-border/50 mt-1">
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <Radio name="openapi-conflict" checked={!overwrite()} onChange={() => setOverwrite(false)} />
                      <span>{t("openapi.skipDuplicates")}</span>
                    </label>
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <Radio name="openapi-conflict" checked={overwrite()} onChange={() => setOverwrite(true)} />
                      <span>{t("openapi.overwriteDuplicates")}</span>
                    </label>
                  </div>
                </Show>
              </div>

              <SelectAllRow
                selected={selected()}
                total={data().items.length}
                onChange={(all) => setSelected(all ? new Set(data().items.map(i => i.index)) : new Set())}
              />
              <div class="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-input">
                <For each={data().items}>
                  {(item) => (
                    <label class="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-border/50 last:border-b-0 cursor-pointer">
                      <Checkbox
                        checked={selected().has(item.index)}
                        onChange={(e) => setSelected(toggleIndex(selected(), item.index, e.currentTarget.checked))}
                      />
                      <span class="font-mono text-xs font-semibold w-14 shrink-0 text-accent">{item.method}</span>
                      <span class="flex-1 min-w-0 truncate" title={item.path}>{item.name}</span>
                      <Show when={item.duplicate}>
                        <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">{t("openapi.duplicate")}</span>
                      </Show>
                    </label>
                  )}
                </For>
              </div>
            </>
          )}
        </Show>
        <div class="flex justify-end gap-2 pt-2 shrink-0">
          <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
          <Button onClick={confirm} disabled={!preview() || selected().size === 0 || importing()}>
            {importing() ? t("common.saving") : t("openapi.confirmImport")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ---- Apifox ----

/** Apifox 预览项类型标签 */
function apifoxKindLabel(kind: string): string {
  switch (kind) {
    case "http": return t("apifox.kind.http")
    case "websocket": return t("apifox.kind.websocket")
    case "doc": return t("apifox.kind.doc")
    case "request": return t("apifox.kind.request")
    default: return kind
  }
}

/** Apifox 导入预览的单项统计 */
function ApifoxStat(props: { label: string; value: number }) {
  return (
    <div class="flex items-center justify-between px-2 py-1 rounded bg-muted/40">
      <span class="text-muted-foreground">{props.label}</span>
      <span class="font-medium tabular-nums">{props.value}</span>
    </div>
  )
}

export interface ApifoxImportDialogProps {
  open: boolean
  onClose: () => void
  /** 导入目标项目；不传表示「导入为新项目」（首页入口），此时对话框里可以改项目名 */
  projectId?: string
  json: string
  onImported: () => void | Promise<void>
}

export function ApifoxImportDialog(props: ApifoxImportDialogProps) {
  const [preview, setPreview] = createSignal<ApifoxPreview | null>(null)
  const [selected, setSelected] = createSignal<Set<number>>(new Set())
  const [importing, setImporting] = createSignal(false)
  const [error, setError] = createSignal("")
  /** 「导入为新项目」时的项目名，默认取导出文件的 $.info.name */
  const [projectName, setProjectName] = createSignal("")

  /** 没给目标项目 = 建新项目 */
  const createsProject = () => !props.projectId

  createEffect(on(() => [props.open, props.json] as const, async ([open, json]) => {
    if (!open || !json) return
    setError("")
    setPreview(null)
    setProjectName("")
    try {
      const result = await ApifoxService.PreviewApifox(json)
      // 非 Apifox 导出文件要明确提示，否则用户只会看到一份空预览
      if (!result?.isApifox) {
        setError(t("apifox.notApifox"))
        return
      }
      setPreview(result)
      setProjectName(result.projectName ?? "")
      setSelected(new Set((result?.items ?? []).map(item => item.index)))
    } catch (e) {
      toastError(e, "error.op.previewFailed")
      setError(t("apifox.parseFailed"))
    }
  }))

  const confirm = async () => {
    if (!props.json) return
    setImporting(true)
    try {
      const projectId = props.projectId
      if (projectId) {
        await ApifoxService.ImportApifox(projectId, props.json, Array.from(selected()))
      } else {
        await ApifoxService.ImportApifoxAsProject(projectName().trim(), props.json, Array.from(selected()))
      }
      props.onClose()
      toastSuccess(t("importexport.imported"))
      await props.onImported()
    } catch (e) {
      toastError(e, "error.op.importFailed")
      setError(t("apifox.importFailed"))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={createsProject() ? t("apifox.importAsProjectTitle") : t("apifox.importTitle")} closeOnEsc closeOnOverlayClick width="560px">
      <div class="px-6 py-4 flex flex-col h-[70vh] gap-3">
        <Show when={error()}>
          <div class="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md shrink-0">{error()}</div>
        </Show>
        <Show when={!error() && !preview()}>
          <div class="flex-1 flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>
        </Show>
        <Show when={preview()}>
          {(data) => (
            <>
              <Show
                when={createsProject()}
                fallback={<p class="text-sm text-muted-foreground shrink-0">{t("apifox.summaryHint", { name: data().projectName })}</p>}
              >
                {/* 新建项目时项目名可改，默认就是导出文件里的 $.info.name */}
                <div class="flex flex-col gap-1.5 shrink-0">
                  <span class="text-xs font-medium text-muted-foreground">{t("apifox.projectName")}</span>
                  <Input
                    value={projectName()}
                    onInput={(e) => setProjectName(e.currentTarget.value)}
                    placeholder={data().projectName || t("apifox.projectName")}
                  />
                </div>
              </Show>
              <div class="grid grid-cols-4 gap-2 text-sm shrink-0">
                <ApifoxStat label={t("apifox.stat.modules")} value={data().modules} />
                <ApifoxStat label={t("apifox.stat.endpoints")} value={data().endpoints} />
                <ApifoxStat label={t("apifox.stat.folders")} value={data().folders} />
                <ApifoxStat label={t("apifox.stat.documents")} value={data().documents} />
                <ApifoxStat label={t("apifox.stat.webSockets")} value={data().webSockets} />
                <ApifoxStat label={t("apifox.stat.environments")} value={data().environments} />
                <ApifoxStat label={t("apifox.stat.globalVars")} value={data().globalVars} />
                <ApifoxStat label={t("apifox.stat.scripts")} value={data().scripts} />
              </div>

              <SelectAllRow
                selected={selected()}
                total={data().items.length}
                onChange={(all) => setSelected(all ? new Set(data().items.map(i => i.index)) : new Set())}
              />
              <div class="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-input">
                <For each={data().items}>
                  {(item) => (
                    <label class="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-border/50 last:border-b-0 cursor-pointer">
                      <Checkbox
                        checked={selected().has(item.index)}
                        onChange={(e) => setSelected(toggleIndex(selected(), item.index, e.currentTarget.checked))}
                      />
                      <span class="shrink-0 w-16 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-center">{apifoxKindLabel(item.kind)}</span>
                      <Show when={item.kind === "http" || item.kind === "request"}>
                        <span class="font-mono text-xs font-semibold w-12 shrink-0 text-accent">{item.method}</span>
                      </Show>
                      <span class="flex-1 min-w-0 truncate" title={item.path}>{item.name}</span>
                      <Show when={item.folderPath}>
                        <span class="shrink-0 text-[10px] text-muted-foreground truncate max-w-40" title={item.folderPath}>{item.folderPath}</span>
                      </Show>
                    </label>
                  )}
                </For>
              </div>
              <p class="text-xs text-muted-foreground shrink-0">{t("apifox.dedupHint")}</p>
            </>
          )}
        </Show>
        <div class="flex justify-end gap-2 pt-2 shrink-0">
          <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
          <Button onClick={confirm} disabled={!preview() || selected().size === 0 || importing() || (createsProject() && !projectName().trim())}>
            {importing() ? t("common.saving") : t("apifox.confirmImport")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ---- cURL ----

export interface CurlImportDialogProps {
  open: boolean
  onClose: () => void
  /** 解析成功后交给调用方去建标签页 */
  onParsed: (request: CurlRequest) => void
}

export function CurlImportDialog(props: CurlImportDialogProps) {
  const [text, setText] = createSignal("")
  const [importing, setImporting] = createSignal(false)

  createEffect(on(() => props.open, (open) => { if (open) setText("") }))

  const confirm = async () => {
    const command = text().trim()
    if (!command) return
    setImporting(true)
    try {
      const parsed = await CurlService.ParseCurl(command)
      if (parsed) {
        props.onParsed(parsed)
        props.onClose()
        toastSuccess(t("curl.imported"))
      }
    } catch (e) {
      toastError(e, "error.op.importFailed")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("curl.importTitle")} closeOnEsc closeOnOverlayClick width="620px">
      <div class="px-6 py-4 flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{t("curl.importHint")}</p>
        <Textarea
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          rows={10}
          spellcheck={false}
          placeholder={"curl 'https://api.example.com/users' \\\n  -H 'Accept: application/json'"}
          class="font-mono text-xs"
        />
      </div>
      <div class="flex justify-end gap-2 px-6 py-3 border-t border-border">
        <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
        <Button onClick={confirm} disabled={!text().trim() || importing()}>
          {importing() ? t("common.loading") : t("common.confirm")}
        </Button>
      </div>
    </Dialog>
  )
}

// ---- Postman ----

/** 导入预览里的一个统计格子 */
function Stat(props: { label: string; value: number }) {
  return (
    <div class="rounded-md border border-border px-2 py-1.5 text-center">
      <div class="text-base font-medium tabular-nums">{props.value}</div>
      <div class="text-[11px] text-muted-foreground">{props.label}</div>
    </div>
  )
}

export interface PostmanImportDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  json: string
  onImported: () => void | Promise<void>
}

export function PostmanImportDialog(props: PostmanImportDialogProps) {
  const [preview, setPreview] = createSignal<PostmanPreview | null>(null)
  const [importing, setImporting] = createSignal(false)

  createEffect(on(() => [props.open, props.json] as const, async ([open, json]) => {
    if (!open || !json) return
    setPreview(null)
    try {
      setPreview(await PostmanService.PreviewPostman(json))
    } catch (e) {
      toastError(e, "error.op.previewFailed")
      props.onClose()
    }
  }))

  const confirm = async () => {
    if (!props.json) return
    setImporting(true)
    try {
      await PostmanService.ImportPostman(props.projectId, props.json)
      props.onClose()
      toastSuccess(t("importexport.imported"))
      await props.onImported()
    } catch (e) {
      toastError(e, "error.op.importFailed")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={t("postman.importTitle")} closeOnEsc closeOnOverlayClick width="520px">
      <div class="px-6 py-4 flex flex-col gap-3">
        <Show when={preview()} fallback={<p class="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}>
          {(data) => (
            <div class="space-y-2 text-sm">
              <p class="font-medium">{data().name}</p>
              <Show when={data().description}>
                <p class="text-muted-foreground">{data().description}</p>
              </Show>
              <div class="grid grid-cols-3 gap-2 pt-2">
                <Stat label={t("postman.stat.folders")} value={data().folders} />
                <Stat label={t("postman.stat.endpoints")} value={data().endpoints} />
                <Stat label={t("postman.stat.variables")} value={data().variables} />
              </div>
              <Show when={data().hasScripts}>
                <p class="text-xs text-muted-foreground pt-1">{t("postman.scriptsHint")}</p>
              </Show>
              <p class="text-xs text-muted-foreground">{t("postman.moduleHint")}</p>
            </div>
          )}
        </Show>
      </div>
      <div class="flex justify-end gap-2 px-6 py-3 border-t border-border">
        <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
        <Button onClick={confirm} disabled={!preview() || importing()}>
          {importing() ? t("common.loading") : t("common.confirm")}
        </Button>
      </div>
    </Dialog>
  )
}
