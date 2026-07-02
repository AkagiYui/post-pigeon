// 文档编辑器（Markdown）：支持编辑 / 预览两种模式
import { createSignal, Show } from "solid-js"

import { CodeEditor } from "@/components/ui/code-editor"
import { t } from "@/hooks/useI18n"
import { renderMarkdown } from "@/lib/markdown"
import { cn } from "@/lib/utils"

export interface DocumentEditorProps {
  content: string
  onChange: (content: string) => void
}

export function DocumentEditor(props: DocumentEditorProps) {
  const [mode, setMode] = createSignal<"edit" | "preview">("edit")

  const modes: { key: "edit" | "preview"; label: string }[] = [
    { key: "edit", label: t("doc.edit") },
    { key: "preview", label: t("doc.preview") },
  ]

  return (
    <div class="flex flex-col h-full p-3">
      <div class="flex gap-1 mb-3 shrink-0">
        {modes.map((m) => (
          <button
            class={cn(
              "px-2.5 py-1 text-xs rounded-md transition-colors",
              mode() === m.key ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div class="flex-1 min-h-0">
        <Show when={mode() === "edit"} fallback={
          <div
            class="markdown-preview h-full overflow-auto rounded-md border border-border bg-input px-4 py-3 text-sm leading-relaxed"
            innerHTML={renderMarkdown(props.content)}
          />
        }>
          <CodeEditor language="markdown" value={props.content} onChange={props.onChange} placeholder={t("doc.placeholder")} />
        </Show>
      </div>
    </div>
  )
}
