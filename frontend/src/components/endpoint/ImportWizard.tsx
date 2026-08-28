// 导入向导：先选导入类型，再选内容来源（文件 / URL / 文本），拿到文档内容后
// 交给各自的预览对话框继续。
//
// 之前每种格式在菜单里各占一项、各自只支持「选文件」；把入口收拢到一个模态框后，
// 「从哪儿来」这件事只需要实现一次，三种来源对任何格式都可用。
//
// 首页的「导入项目」复用同一个向导，只是可选类型换成项目级的两种
// （本应用导出文件 / Apifox），由调用方通过 kinds 指定。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"

import { ImportExportService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input, Textarea } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { readText } from "@/lib/clipboard"
import { cn } from "@/lib/utils"
import { nativeFileDropAvailable, onFilesDropped } from "@/stores/fileDrop"
import { toastError } from "@/stores/toast"

/** 支持的导入格式。project 是本应用自己的项目导出文件（仅首页「导入项目」用） */
export type ImportKind = "postman" | "apifox" | "openapi" | "project"

/** 文档内容的来源 */
type ImportSource = "file" | "url" | "text"

/** 拖放区标识，与元素上的 data-drop-zone 属性一致（见 stores/fileDrop.ts） */
const DROP_ZONE = "import-document"

/** 类型选择卡片的元数据 */
interface KindMeta {
  kind: ImportKind
  icon: string
  iconClass: string
}

const KIND_META: Record<ImportKind, KindMeta> = {
  openapi: { kind: "openapi", icon: "lucide:file-json", iconClass: "text-emerald-500" },
  postman: { kind: "postman", icon: "lucide:file-down", iconClass: "text-amber-600" },
  apifox: { kind: "apifox", icon: "lucide:file-down", iconClass: "text-orange-500" },
  project: { kind: "project", icon: "lucide:package", iconClass: "text-sky-500" },
}

/** 「导入接口」默认可选的三种格式 */
const DEFAULT_KINDS: ImportKind[] = ["openapi", "postman", "apifox"]

const SOURCES: { source: ImportSource; icon: string }[] = [
  { source: "file", icon: "lucide:file-up" },
  { source: "url", icon: "lucide:link" },
  { source: "text", icon: "lucide:clipboard" },
]

export interface ImportWizardDialogProps {
  open: boolean
  onClose: () => void
  /** 锁定导入格式（从模块菜单进入时只会是 OpenAPI），不传则由用户选 */
  fixedKind?: ImportKind
  /** 可选的导入格式，默认为接口级的三种；首页「导入项目」传项目级的两种 */
  kinds?: ImportKind[]
  /** 对话框标题，默认「导入接口」 */
  title?: string
  /** 读取到文档内容后的回调，由调用方打开对应格式的预览对话框 */
  onLoaded: (kind: ImportKind, text: string) => void
}

export function ImportWizardDialog(props: ImportWizardDialogProps) {
  const kinds = () => props.kinds ?? DEFAULT_KINDS
  const [kind, setKind] = createSignal<ImportKind>(DEFAULT_KINDS[0])
  const [source, setSource] = createSignal<ImportSource>("file")
  const [fileName, setFileName] = createSignal("")
  const [fileText, setFileText] = createSignal("")
  const [url, setUrl] = createSignal("")
  const [text, setText] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [dragging, setDragging] = createSignal(false)

  // 每次打开都从干净状态开始：上一次留下的文件名/URL 容易让人误以为这次也带着它
  createEffect(on(() => props.open, (open) => {
    if (!open) return
    setKind(props.fixedKind ?? kinds()[0])
    setSource("file")
    setFileName("")
    setFileText("")
    setUrl("")
    setText("")
    setDragging(false)
  }))

  const acceptFile = async (file: File) => {
    try {
      setFileText(await file.text())
      setFileName(file.name)
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  // 应用内的拖放走原生链路：只拿得到路径，正文要回后端读。
  // 订阅始终挂着（对话框关着时 data-file-drop-target 元素不存在，事件不会派发到这里）。
  onCleanup(onFilesDropped(DROP_ZONE, (paths) => {
    const path = paths[0]
    if (!path) return
    void (async () => {
      try {
        const content = await ImportExportService.ReadImportDocument(path)
        if (!content) return
        setFileText(content)
        setFileName(path.split(/[\\/]/).pop() || path)
      } catch (e) {
        toastError(e, "error.op.loadFailed")
      }
    })()
  }))

  const pickFile = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json,.json"
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void acceptFile(file)
    }
    input.click()
  }

  const pasteFromClipboard = async () => {
    try {
      const clip = await readText()
      if (clip) setText(clip)
    } catch (e) {
      toastError(e, "error.op.clipboardFailed")
    }
  }

  /** 当前来源是否已经给出了可导入的内容 */
  const ready = () => {
    switch (source()) {
      case "file": return !!fileText()
      case "url": return !!url().trim()
      case "text": return !!text().trim()
    }
  }

  const confirm = async () => {
    if (!ready()) return
    if (source() === "file") { props.onLoaded(kind(), fileText()); return }
    if (source() === "text") { props.onLoaded(kind(), text().trim()); return }
    // URL 由后端拉取：WebView 里的跨域请求会被 CORS 拦下
    setLoading(true)
    try {
      const fetched = await ImportExportService.FetchImportDocument(url().trim())
      if (fetched) props.onLoaded(kind(), fetched)
    } catch (e) {
      toastError(e, "error.importexport.fetch_failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.title ?? t("import.title")} closeOnEsc closeOnOverlayClick width="560px">
      <div class="px-6 py-4 flex flex-col gap-4">
        {/* 导入类型（调用方锁定格式时不显示） */}
        <Show when={!props.fixedKind}>
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-muted-foreground">{t("import.kindLabel")}</span>
            {/* 列数跟着可选格式数走：两种格式时占满，不留一格空白 */}
            <div class="grid gap-2" style={{ "grid-template-columns": `repeat(${kinds().length}, minmax(0, 1fr))` }}>
              <For each={kinds().map(k => KIND_META[k])}>
                {(meta) => (
                  <button
                    type="button"
                    onClick={() => setKind(meta.kind)}
                    class={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                      kind() === meta.kind
                        ? "border-accent bg-accent-muted"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon icon={meta.icon} class={cn("h-4 w-4 shrink-0 mt-0.5", meta.iconClass)} />
                    <span class="min-w-0 flex flex-col gap-0.5">
                      <span class="text-sm truncate">{t(`import.kind.${meta.kind}`)}</span>
                      <span class="text-[11px] text-muted-foreground">{t(`import.hint.${meta.kind}`)}</span>
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* 内容来源 */}
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-muted-foreground">{t("import.sourceLabel")}</span>
          <div class="flex items-center gap-1 p-0.5 rounded-md bg-muted w-fit">
            <For each={SOURCES}>
              {(item) => (
                <button
                  type="button"
                  onClick={() => setSource(item.source)}
                  class={cn(
                    "flex items-center gap-1.5 px-3 h-7 rounded text-xs transition-colors",
                    source() === item.source ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon icon={item.icon} class="h-3.5 w-3.5" />
                  {t(`import.source.${item.source}`)}
                </button>
              )}
            </For>
          </div>

          <Show when={source() === "file"}>
            {/* 拖拽区兼作点击区：两种习惯都能用。
                data-file-drop-target 是 Wails 判定「这里能放」的标记，缺了它原生拖放会被丢弃；
                拖上来时运行时会给它加 file-drop-target-active 类，高亮沿用同一套样式。
                浏览器里没有原生链路，退回 HTML5 的 drop 事件。 */}
            <div
              data-file-drop-target
              data-drop-zone={DROP_ZONE}
              onClick={pickFile}
              onDragOver={(e) => {
                e.preventDefault()
                if (!nativeFileDropAvailable()) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                // 应用内交给原生链路处理，两边都收会把同一次拖放处理两遍
                if (nativeFileDropAvailable()) return
                const file = e.dataTransfer?.files?.[0]
                if (file) void acceptFile(file)
              }}
              class={cn(
                "flex flex-col items-center justify-center gap-1.5 h-32 rounded-md border border-dashed cursor-pointer transition-colors",
                "[&.file-drop-target-active]:border-accent [&.file-drop-target-active]:bg-accent-muted",
                dragging() ? "border-accent bg-accent-muted" : "border-border hover:bg-muted/50",
              )}
            >
              <Icon icon="lucide:upload" class="h-5 w-5 text-muted-foreground" />
              <Show when={fileName()} fallback={<span class="text-xs text-muted-foreground">{t("import.file.hint")}</span>}>
                <span class="text-xs text-foreground max-w-full truncate px-4" title={fileName()}>{fileName()}</span>
                <span class="text-[11px] text-muted-foreground">{t("import.file.replace")}</span>
              </Show>
            </div>
          </Show>

          <Show when={source() === "url"}>
            <div class="flex flex-col gap-1.5">
              <Input
                value={url()}
                onInput={(e) => setUrl(e.currentTarget.value)}
                placeholder="https://example.com/collection.json"
                spellcheck={false}
                class="font-mono text-xs"
              />
              <span class="text-[11px] text-muted-foreground">{t("import.url.hint")}</span>
            </div>
          </Show>

          <Show when={source() === "text"}>
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-end">
                <Button variant="ghost" size="sm" onClick={pasteFromClipboard}>
                  <Icon icon="lucide:clipboard-paste" class="h-3.5 w-3.5" />
                  {t("import.paste")}
                </Button>
              </div>
              <Textarea
                value={text()}
                onInput={(e) => setText(e.currentTarget.value)}
                rows={8}
                spellcheck={false}
                placeholder={t("import.text.placeholder")}
                class="font-mono text-xs"
              />
            </div>
          </Show>
        </div>
      </div>

      <div class="flex justify-end gap-2 px-6 py-3 border-t border-border">
        <Button variant="outline" onClick={props.onClose}>{t("common.cancel")}</Button>
        <Button onClick={confirm} disabled={!ready() || loading()}>
          {loading() ? t("import.fetching") : t("import.next")}
        </Button>
      </div>
    </Dialog>
  )
}
