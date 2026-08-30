import { Icon } from "@iconify-icon/solid"
import { createSignal, For } from "solid-js"

import { ImportExportService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { t } from "@/hooks/useI18n"
import { downloadExportedDocument } from "@/lib/utils"
import { toastError, toastSuccess } from "@/stores/toast"

const projectExportFormats = [
  { value: "project", label: "PostPigeon Project", icon: "lucide:archive", hint: "project" },
  { value: "openapi31", label: "OpenAPI 3.1", icon: "lucide:braces", hint: "openapi31" },
  { value: "openapi30", label: "OpenAPI 3.0", icon: "lucide:braces", hint: "openapi30" },
  { value: "swagger2", label: "Swagger 2.0", icon: "lucide:braces", hint: "swagger2" },
  { value: "postman", label: "Postman Collection", icon: "lucide:box", hint: "postman" },
  { value: "har", label: "HAR 1.2", icon: "lucide:network", hint: "har" },
  { value: "markdown", label: "Markdown", icon: "lucide:file-text", hint: "markdown" },
  { value: "html", label: "HTML", icon: "lucide:file-code-2", hint: "html" },
  { value: "word", label: "Word", icon: "lucide:file-type-2", hint: "word" },
]

export function ProjectExportDialog(props: {
  open: boolean
  projectId: string
  projectName: string
  onClose: () => void
}) {
  const [pendingFormat, setPendingFormat] = createSignal("")
  const [secretSummary, setSecretSummary] = createSignal<{ secretVariables: number; authCredentials: number } | null>(null)
  const [exporting, setExporting] = createSignal(false)

  const close = () => {
    if (exporting()) return
    setPendingFormat("")
    setSecretSummary(null)
    props.onClose()
  }

  const exportProject = async (format: string, includeSecrets: boolean) => {
    if (exporting()) return
    setExporting(true)
    try {
      const document = await ImportExportService.ExportProjectAs(props.projectId, format, includeSecrets)
      if (!document) throw new Error("Export returned no document")
      downloadExportedDocument(document)
      toastSuccess(t("importexport.exported"))
      setSecretSummary(null)
      props.onClose()
    } catch (error) {
      toastError(error, "error.op.exportFailed")
    } finally {
      setExporting(false)
    }
  }

  const chooseFormat = async (format: string) => {
    if (exporting()) return
    setPendingFormat(format)
    try {
      const summary = await ImportExportService.InspectExportSecrets(props.projectId)
      const normalized = {
        secretVariables: summary?.secretVariables ?? 0,
        authCredentials: summary?.authCredentials ?? 0,
      }
      if (normalized.secretVariables + normalized.authCredentials === 0) {
        await exportProject(format, false)
      } else {
        setSecretSummary(normalized)
      }
    } catch (error) {
      toastError(error, "error.op.exportFailed")
    }
  }

  return (
    <>
      <Dialog
        open={props.open && secretSummary() === null}
        onClose={close}
        title={t("export.project.title", { name: props.projectName })}
        closeOnEsc
        closeOnOverlayClick
        width="680px"
      >
        <div class="space-y-4 p-6">
          <p class="text-sm text-muted-foreground">{t("export.project.hint")}</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <For each={projectExportFormats}>
              {(format) => (
                <button
                  type="button"
                  disabled={exporting()}
                  onClick={() => void chooseFormat(format.value)}
                  class="rounded-md border border-border p-3 text-left transition-colors hover:border-accent hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div class="flex items-center gap-2 text-sm font-medium">
                    <Icon icon={format.icon} class="h-4 w-4 text-accent" />
                    {format.label}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">{t(`export.project.format.${format.hint}`)}</div>
                </button>
              )}
            </For>
          </div>
          <p class="text-xs text-amber-700 dark:text-amber-300">{t("export.project.secrets")}</p>
        </div>
      </Dialog>

      <Dialog
        open={props.open && secretSummary() !== null}
        onClose={() => { if (!exporting()) setSecretSummary(null) }}
        title={t("importexport.exportSecrets.title")}
        closeOnEsc
        closeOnOverlayClick
      >
        <div class="space-y-4 p-6">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <Icon icon="lucide:key-round" class="h-5 w-5 text-amber-500" />
            </div>
            <div class="flex-1 space-y-2">
              <p class="text-foreground">{t("importexport.exportSecrets.body", {
                variables: secretSummary()?.secretVariables ?? 0,
                credentials: secretSummary()?.authCredentials ?? 0,
              })}</p>
              <p class="text-sm text-muted-foreground">{t("importexport.exportSecrets.hint")}</p>
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" disabled={exporting()} onClick={() => setSecretSummary(null)}>{t("common.cancel")}</Button>
            <Button variant="outline" disabled={exporting()} onClick={() => void exportProject(pendingFormat(), true)}>{t("importexport.exportSecrets.include")}</Button>
            <Button disabled={exporting()} onClick={() => void exportProject(pendingFormat(), false)}>{t("importexport.exportSecrets.exclude")}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
