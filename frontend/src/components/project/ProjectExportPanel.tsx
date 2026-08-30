import { Icon } from "@iconify-icon/solid"
import { Dialogs } from "@wailsio/runtime"
import { createEffect, createMemo, createSignal, For, type JSX, onMount, Show } from "solid-js"

import type { Endpoint, Environment } from "@/../bindings/PostPigeon/internal/models/models"
import { EnvironmentService, ImportExportService, ProjectService } from "@/../bindings/PostPigeon/internal/services"
import type { FolderTree, ModuleTree, ProjectExportOptions } from "@/../bindings/PostPigeon/internal/services/models"
import { Button } from "@/components/ui/button"
import { Checkbox, Radio } from "@/components/ui/checkbox"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { toastError, toastSuccess } from "@/stores/toast"

type ScopeType = "all" | "folders" | "endpoints" | "tags"

interface FolderChoice { id: string; label: string; depth: number }
interface EndpointChoice { id: string; label: string; method: string; tags: string[] }

const projectExportFormats = [
  { value: "project", label: "PostPigeon Project", icon: "lucide:archive", hint: "project" },
  { value: "openapi", label: "OpenAPI", icon: "lucide:braces", hint: "openapi" },
  { value: "postman", label: "Postman Collection", icon: "lucide:box", hint: "postman" },
  { value: "har", label: "HAR 1.2", icon: "lucide:network", hint: "har" },
  { value: "markdown", label: "Markdown", icon: "lucide:file-text", hint: "markdown" },
  { value: "html", label: "HTML", icon: "lucide:file-code-2", hint: "html" },
  { value: "word", label: "Word", icon: "lucide:file-type-2", hint: "word" },
]

function parseTags(endpoint: Endpoint): string[] {
  try {
    const value = JSON.parse(endpoint.tags || "[]")
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : []
  } catch {
    return []
  }
}

function collectFolderChoices(folders: FolderTree[], moduleName: string, depth = 0, parentPath = ""): FolderChoice[] {
  const out: FolderChoice[] = []
  for (const folder of folders) {
    if (folder.name === "__root") {
      out.push(...collectFolderChoices(folder.children, moduleName, depth, parentPath))
      continue
    }
    const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name
    out.push({ id: folder.id, label: `${moduleName} / ${path}`, depth })
    out.push(...collectFolderChoices(folder.children, moduleName, depth + 1, path))
  }
  return out
}

function collectFolderEndpoints(folder: FolderTree, moduleName: string, parentPath = ""): EndpointChoice[] {
  const path = folder.name === "__root" ? parentPath : (parentPath ? `${parentPath} / ${folder.name}` : folder.name)
  const prefix = path ? `${moduleName} / ${path}` : moduleName
  return [
    ...folder.endpoints.filter(endpoint => endpoint.type === "http").map(endpoint => ({
      id: endpoint.id,
      label: `${prefix} / ${endpoint.name || endpoint.path}`,
      method: endpoint.method,
      tags: parseTags(endpoint),
    })),
    ...folder.children.flatMap(child => collectFolderEndpoints(child, moduleName, path)),
  ]
}

function collectEndpointChoices(modules: ModuleTree[]): EndpointChoice[] {
  return modules.flatMap(module => [
    ...module.endpoints.filter(endpoint => endpoint.type === "http").map(endpoint => ({
      id: endpoint.id,
      label: `${module.name} / ${endpoint.name || endpoint.path}`,
      method: endpoint.method,
      tags: parseTags(endpoint),
    })),
    ...module.folders.flatMap(folder => collectFolderEndpoints(folder, module.name)),
  ])
}

function toggleValue(values: string[], value: string, checked: boolean): string[] {
  if (checked) return values.includes(value) ? values : [...values, value]
  return values.filter(item => item !== value)
}

export function ProjectExportPanel(props: { projectId: string; projectName: string }) {
  const [format, setFormat] = createSignal("openapi")
  const [scopeType, setScopeType] = createSignal<ScopeType>("all")
  const [selectedFolderIds, setSelectedFolderIds] = createSignal<string[]>([])
  const [selectedEndpointIds, setSelectedEndpointIds] = createSignal<string[]>([])
  const [selectedTags, setSelectedTags] = createSignal<string[]>([])
  const [excludedTags, setExcludedTags] = createSignal<string[]>([])
  const [specVersion, setSpecVersion] = createSignal("3.1")
  const [fileFormat, setFileFormat] = createSignal("json")
  const [oasTitle, setOasTitle] = createSignal(props.projectName)
  const [documentVersion, setDocumentVersion] = createSignal("1.0.0")
  const [includeExtensions, setIncludeExtensions] = createSignal(false)
  const [addFoldersToTags, setAddFoldersToTags] = createSignal(false)
  const [selectedEnvironmentIds, setSelectedEnvironmentIds] = createSignal<string[]>([])
  const [modules, setModules] = createSignal<ModuleTree[]>([])
  const [environments, setEnvironments] = createSignal<Environment[]>([])
  const [loading, setLoading] = createSignal(true)
  const [secretSummary, setSecretSummary] = createSignal<{ secretVariables: number; authCredentials: number } | null>(null)
  const [exporting, setExporting] = createSignal(false)

  const folderChoices = createMemo(() => modules().flatMap(module => collectFolderChoices(module.folders, module.name)))
  const endpointChoices = createMemo(() => collectEndpointChoices(modules()))
  const availableTags = createMemo(() => [...new Set(endpointChoices().flatMap(endpoint => endpoint.tags))].sort((a, b) => a.localeCompare(b)))
  const isNativeBackup = createMemo(() => format() === "project")
  const usesEnvironment = createMemo(() => format() === "openapi" || format() === "har")
  const suggestedFileName = createMemo(() => {
    const base = props.projectName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "project"
    if (format() === "project") return `${base}.postpigeon.json`
    if (format() === "openapi") {
      const suffix = specVersion() === "2.0" ? "swagger-2.0" : `openapi-${specVersion()}`
      return `${base}.${suffix}.zip`
    }
    if (format() === "postman") return `${base}.postman_collection.json`
    if (format() === "har") return `${base}.har`
    if (format() === "markdown") return `${base}.md`
    if (format() === "html") return `${base}.html`
    return `${base}.docx`
  })

  onMount(async () => {
    try {
      const saved = localStorage.getItem(`postpigeon:project-export:${props.projectId}`)
      if (saved) {
        const value = JSON.parse(saved) as Partial<ProjectExportOptions>
        if (value.format && projectExportFormats.some(item => item.value === value.format)) setFormat(value.format)
        if (["all", "folders", "endpoints", "tags"].includes(value.scope?.type || "")) setScopeType(value.scope!.type as ScopeType)
        setSelectedFolderIds(value.scope?.selectedFolderIds || [])
        setSelectedEndpointIds(value.scope?.selectedEndpointIds || [])
        setSelectedTags(value.scope?.selectedTags || [])
        setExcludedTags(value.scope?.excludedTags || [])
        if (["3.1", "3.0", "2.0"].includes(value.openapi?.specVersion || "")) setSpecVersion(value.openapi!.specVersion)
        if (["json", "yaml"].includes(value.openapi?.fileFormat || "")) setFileFormat(value.openapi!.fileFormat)
        if (value.openapi?.title) setOasTitle(value.openapi.title)
        if (value.openapi?.documentVersion) setDocumentVersion(value.openapi.documentVersion)
        setIncludeExtensions(value.openapi?.includeExtensionProperties ?? false)
        setAddFoldersToTags(value.openapi?.addFoldersToTags ?? false)
        setSelectedEnvironmentIds(value.environmentIds || [])
      }
      const [tree, envs] = await Promise.all([
        ProjectService.GetProjectTree(props.projectId),
        EnvironmentService.ListEnvironments(props.projectId),
      ])
      setModules(tree || [])
      setEnvironments(envs || [])
    } catch (error) {
      toastError(error, "error.op.exportFailed")
    } finally {
      setLoading(false)
    }
  })

  const buildOptions = (includeSecrets: boolean): ProjectExportOptions => ({
    format: format(),
    includeSecrets,
    scope: {
      type: isNativeBackup() ? "all" : scopeType(),
      selectedFolderIds: selectedFolderIds(),
      selectedEndpointIds: selectedEndpointIds(),
      selectedTags: selectedTags(),
      excludedTags: excludedTags(),
    },
    openapi: {
      specVersion: specVersion(),
      fileFormat: fileFormat(),
      title: oasTitle().trim(),
      documentVersion: documentVersion().trim(),
      includeExtensionProperties: includeExtensions(),
      addFoldersToTags: addFoldersToTags(),
    },
    environmentIds: usesEnvironment() ? selectedEnvironmentIds() : [],
  })

  createEffect(() => {
    if (loading()) return
    localStorage.setItem(`postpigeon:project-export:${props.projectId}`, JSON.stringify(buildOptions(false)))
  })

  const validateSelection = () => {
    if (isNativeBackup() || scopeType() === "all") return true
    if (scopeType() === "folders") return selectedFolderIds().length > 0
    if (scopeType() === "endpoints") return selectedEndpointIds().length > 0
    return selectedTags().length > 0
  }

  const exportProject = async (includeSecrets: boolean) => {
    if (exporting()) return
    if (!validateSelection()) {
      toastError(new Error(t("export.project.scope.empty")), "error.op.exportFailed")
      return
    }
    setExporting(true)
    try {
      const document = await ImportExportService.ExportProjectConfigured(props.projectId, buildOptions(includeSecrets))
      if (!document) throw new Error("Export returned no document")
      const path = await Dialogs.SaveFile({
        Title: t("export.project.destination.title"),
        Message: t("export.project.destination.message"),
        ButtonText: t("export.project.destination.save"),
        Filename: document.fileName,
        CanCreateDirectories: true,
        AllowsOtherFiletypes: true,
      })
      if (!path) return
      await ImportExportService.SaveExportedDocument(document, path)
      toastSuccess(t("export.project.saved", { path }))
      setSecretSummary(null)
    } catch (error) {
      toastError(error, "error.op.exportFailed")
    } finally {
      setExporting(false)
    }
  }

  const beginExport = async () => {
    if (exporting()) return
    if (!validateSelection()) {
      toastError(new Error(t("export.project.scope.empty")), "error.op.exportFailed")
      return
    }
    try {
      const summary = await ImportExportService.InspectExportSecrets(props.projectId)
      const normalized = { secretVariables: summary?.secretVariables ?? 0, authCredentials: summary?.authCredentials ?? 0 }
      if (normalized.secretVariables + normalized.authCredentials === 0) await exportProject(false)
      else setSecretSummary(normalized)
    } catch (error) {
      toastError(error, "error.op.exportFailed")
    }
  }

  const toggleEnvironment = (id: string, checked: boolean) => {
    if (checked && specVersion() === "2.0") setSelectedEnvironmentIds([id])
    else setSelectedEnvironmentIds(values => toggleValue(values, id, checked))
  }

  return (
    <>
      <div class="max-w-5xl space-y-5">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">{t("export.project.title", { name: props.projectName })}</h2>
          <p class="text-sm text-muted-foreground">{t("export.project.hint")}</p>
        </div>

        <section class="space-y-3 rounded-lg border border-border bg-surface p-4">
          <SectionTitle number="1" title={t("export.project.section.format")} />
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <For each={projectExportFormats}>{item => (
              <button type="button" disabled={exporting()} onClick={() => setFormat(item.value)}
                class="flex items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors disabled:opacity-50"
                classList={{ "border-accent bg-accent-muted": format() === item.value, "border-border hover:bg-hover": format() !== item.value }}>
                <Icon icon={item.icon} class="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span class="min-w-0"><span class="block text-sm font-medium text-foreground">{item.label}</span><span class="mt-0.5 block text-xs leading-4 text-muted-foreground">{t(`export.project.format.${item.hint}`)}</span></span>
              </button>
            )}</For>
          </div>
        </section>

        <Show when={!isNativeBackup()}>
          <section class="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle number="2" title={t("export.project.section.scope")} />
            <div class="flex flex-wrap gap-x-5 gap-y-2">
              <For each={(["all", "folders", "endpoints", "tags"] as ScopeType[])}>{value => (
                <label class="flex cursor-pointer items-center gap-2 text-sm text-foreground"><Radio name="project-export-scope" checked={scopeType() === value} onChange={() => setScopeType(value)} />{t(`export.project.scope.${value}`)}</label>
              )}</For>
            </div>
            <Show when={scopeType() === "folders"}>
              <Show when={folderChoices().length > 0} fallback={<EmptyChoice text={t("export.project.scope.noFolders")} />}>
                <ChoiceList><For each={folderChoices()}>{folder => <ChoiceRow checked={selectedFolderIds().includes(folder.id)} onChange={checked => setSelectedFolderIds(values => toggleValue(values, folder.id, checked))}><span style={{ "padding-left": `${folder.depth * 14}px` }}>{folder.label}</span></ChoiceRow>}</For></ChoiceList>
              </Show>
            </Show>
            <Show when={scopeType() === "endpoints"}>
              <Show when={endpointChoices().length > 0} fallback={<EmptyChoice text={t("export.project.scope.noEndpoints")} />}>
                <ChoiceList><For each={endpointChoices()}>{endpoint => <ChoiceRow checked={selectedEndpointIds().includes(endpoint.id)} onChange={checked => setSelectedEndpointIds(values => toggleValue(values, endpoint.id, checked))}><span class="mr-2 inline-block w-12 text-[11px] font-semibold text-accent">{endpoint.method}</span>{endpoint.label}</ChoiceRow>}</For></ChoiceList>
              </Show>
            </Show>
            <Show when={scopeType() === "tags"}><TagChoices tags={availableTags()} selected={selectedTags()} onChange={setSelectedTags} empty={t("export.project.scope.noTags")} /></Show>
            <Show when={availableTags().length > 0}>
              <div class="space-y-2 border-t border-divider pt-3"><div><p class="text-sm font-medium text-foreground">{t("export.project.scope.excludeTags")}</p><p class="text-xs text-muted-foreground">{t("export.project.scope.excludeTagsHint")}</p></div><TagChoices tags={availableTags()} selected={excludedTags()} onChange={setExcludedTags} empty="" /></div>
            </Show>
          </section>
        </Show>

        <Show when={format() === "openapi"}>
          <section class="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle number="3" title={t("export.project.section.openapi")} />
            <div class="grid gap-4 md:grid-cols-2">
              <Field label={t("export.project.openapi.specVersion")}><Select value={specVersion()} onChange={value => { setSpecVersion(value); if (value === "2.0" && selectedEnvironmentIds().length > 1) setSelectedEnvironmentIds(selectedEnvironmentIds().slice(0, 1)) }} options={[{ value: "3.1", label: "OpenAPI 3.1" }, { value: "3.0", label: "OpenAPI 3.0" }, { value: "2.0", label: "Swagger 2.0" }]} /></Field>
              <Field label={t("export.project.openapi.fileFormat")}><Select value={fileFormat()} onChange={setFileFormat} options={[{ value: "json", label: "JSON" }, { value: "yaml", label: "YAML" }]} /></Field>
              <Field label={t("export.project.openapi.title")}><Input value={oasTitle()} onInput={event => setOasTitle(event.currentTarget.value)} /></Field>
              <Field label={t("export.project.openapi.documentVersion")}><Input value={documentVersion()} onInput={event => setDocumentVersion(event.currentTarget.value)} /></Field>
            </div>
            <div class="space-y-2 border-t border-divider pt-3">
              <label class="flex items-start gap-2 text-sm text-foreground"><Checkbox checked={includeExtensions()} onChange={event => setIncludeExtensions(event.currentTarget.checked)} /><span>{t("export.project.openapi.includeExtensions")}<span class="mt-0.5 block text-xs text-muted-foreground">{t("export.project.openapi.includeExtensionsHint")}</span></span></label>
              <label class="flex items-start gap-2 text-sm text-foreground"><Checkbox checked={addFoldersToTags()} onChange={event => setAddFoldersToTags(event.currentTarget.checked)} /><span>{t("export.project.openapi.folderTags")}<span class="mt-0.5 block text-xs text-muted-foreground">{t("export.project.openapi.folderTagsHint")}</span></span></label>
            </div>
          </section>
        </Show>

        <Show when={usesEnvironment()}>
          <section class="space-y-3 rounded-lg border border-border bg-surface p-4">
            <SectionTitle number={format() === "openapi" ? "4" : "3"} title={t("export.project.section.environment")} />
            <p class="text-xs text-muted-foreground">{specVersion() === "2.0" && format() === "openapi" ? t("export.project.environment.swaggerHint") : t("export.project.environment.hint")}</p>
            <Show when={!loading()} fallback={<p class="text-sm text-muted-foreground">{t("common.loading")}</p>}>
              <Show when={environments().length > 0} fallback={<p class="text-sm text-muted-foreground">{t("export.project.environment.empty")}</p>}>
                <div class="grid gap-2 sm:grid-cols-2"><For each={environments()}>{environment => <label class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-hover"><Checkbox checked={selectedEnvironmentIds().includes(environment.id)} onChange={event => toggleEnvironment(environment.id, event.currentTarget.checked)} />{environment.name}</label>}</For></div>
                <p class="text-xs text-muted-foreground">{selectedEnvironmentIds().length === 0 ? t("export.project.environment.all") : t("export.project.environment.selected", { count: selectedEnvironmentIds().length })}</p>
              </Show>
            </Show>
          </section>
        </Show>

        <section class="space-y-3 rounded-lg border border-border bg-surface p-4">
          <SectionTitle number={format() === "openapi" ? "5" : (usesEnvironment() ? "4" : (isNativeBackup() ? "2" : "3"))} title={t("export.project.section.destination")} />
          <div class="flex items-start gap-3 rounded-md border border-accent/40 bg-accent-muted px-3 py-3"><Icon icon="lucide:hard-drive-download" class="mt-0.5 h-5 w-5 shrink-0 text-accent" /><div class="min-w-0 flex-1"><p class="text-sm font-medium text-foreground">{t("export.project.destination.local")}</p><p class="mt-0.5 text-xs text-muted-foreground">{t("export.project.destination.localHint")}</p><p class="mt-2 break-all font-mono text-xs text-foreground">{suggestedFileName()}</p></div></div>
        </section>

        <div class="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5"><Icon icon="lucide:shield-alert" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" /><p class="text-xs text-amber-700 dark:text-amber-300">{t("export.project.secrets")}</p></div>
        <div class="flex justify-end pb-4"><Button disabled={loading() || exporting()} onClick={() => void beginExport()}><Icon icon={exporting() ? "lucide:loader-circle" : "lucide:download"} class="mr-2 h-4 w-4" classList={{ "animate-spin": exporting() }} />{t("export.project.action")}</Button></div>
      </div>

      <Dialog open={secretSummary() !== null} onClose={() => { if (!exporting()) setSecretSummary(null) }} title={t("importexport.exportSecrets.title")} closeOnEsc closeOnOverlayClick>
        <div class="space-y-4 p-6"><div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10"><Icon icon="lucide:key-round" class="h-5 w-5 text-amber-500" /></div><div class="flex-1 space-y-2"><p class="text-foreground">{t("importexport.exportSecrets.body", { variables: secretSummary()?.secretVariables ?? 0, credentials: secretSummary()?.authCredentials ?? 0 })}</p><p class="text-sm text-muted-foreground">{t("importexport.exportSecrets.hint")}</p></div></div><div class="flex flex-wrap justify-end gap-2 pt-2"><Button variant="outline" disabled={exporting()} onClick={() => setSecretSummary(null)}>{t("common.cancel")}</Button><Button variant="outline" disabled={exporting()} onClick={() => void exportProject(true)}>{t("importexport.exportSecrets.include")}</Button><Button disabled={exporting()} onClick={() => void exportProject(false)}>{t("importexport.exportSecrets.exclude")}</Button></div></div>
      </Dialog>
    </>
  )
}

function SectionTitle(props: { number: string; title: string }) {
  return <div class="flex items-center gap-2"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">{props.number}</span><h3 class="text-sm font-semibold text-foreground">{props.title}</h3></div>
}

function Field(props: { label: string; children: JSX.Element }) {
  return <label class="space-y-1.5"><span class="block text-xs font-medium text-muted-foreground">{props.label}</span>{props.children}</label>
}

function ChoiceList(props: { children: JSX.Element }) {
  return <div class="max-h-72 overflow-y-auto rounded-md border border-border bg-input p-1">{props.children}</div>
}

function EmptyChoice(props: { text: string }) {
  return <p class="rounded-md border border-border bg-input px-3 py-4 text-center text-sm text-muted-foreground">{props.text}</p>
}

function ChoiceRow(props: { checked: boolean; onChange: (checked: boolean) => void; children: JSX.Element }) {
  return <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-hover"><Checkbox checked={props.checked} onChange={event => props.onChange(event.currentTarget.checked)} /><span class="min-w-0 truncate">{props.children}</span></label>
}

function TagChoices(props: { tags: string[]; selected: string[]; onChange: (values: string[]) => void; empty: string }) {
  return <Show when={props.tags.length > 0} fallback={<p class="text-sm text-muted-foreground">{props.empty}</p>}><div class="flex flex-wrap gap-2"><For each={props.tags}>{tag => <label class="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-hover"><Checkbox checked={props.selected.includes(tag)} onChange={event => props.onChange(toggleValue(props.selected, tag, event.currentTarget.checked))} />{tag}</label>}</For></div></Show>
}
