// 基于 CodeMirror 6 的代码编辑器（受控）：语法高亮、代码折叠、自动补全、行号
import { indentWithTab } from "@codemirror/commands"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { xml } from "@codemirror/lang-xml"
import { type Extension } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { createEffect, onCleanup, onMount } from "solid-js"

import { cn } from "@/lib/utils"

export type CodeLanguage = "javascript" | "json" | "xml" | "html" | "markdown" | "text"

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: CodeLanguage
  placeholder?: string
  readOnly?: boolean
  class?: string
}

function langExtension(lang?: CodeLanguage): Extension[] {
  switch (lang) {
    case "javascript": return [javascript()]
    case "json": return [json()]
    case "xml": return [xml()]
    case "html": return [html()]
    case "markdown": return [markdown()]
    default: return []
  }
}

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
}

export function CodeEditor(props: CodeEditorProps) {
  let el: HTMLDivElement | undefined
  let view: EditorView | undefined

  onMount(() => {
    if (!el) return
    const extensions: Extension[] = [
      basicSetup,
      keymap.of([indentWithTab]),
      ...langExtension(props.language ?? "javascript"),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px", backgroundColor: "transparent" },
        ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "auto" },
        "&.cm-focused": { outline: "none" },
        ".cm-gutters": { backgroundColor: "transparent", border: "none" },
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) props.onChange?.(u.state.doc.toString())
      }),
    ]
    if (props.placeholder) extensions.push(cmPlaceholder(props.placeholder))
    if (props.readOnly) extensions.push(EditorView.editable.of(false))
    if (isDark()) extensions.push(oneDark)

    view = new EditorView({ doc: props.value ?? "", extensions, parent: el })
  })

  // 外部 value 变化时同步到编辑器（避免与内部编辑循环冲突）
  createEffect(() => {
    const v = props.value ?? ""
    if (view && v !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } })
    }
  })

  onCleanup(() => view?.destroy())

  return <div ref={el} class={cn("h-full w-full overflow-hidden rounded-md border border-border bg-input", props.class)} />
}
