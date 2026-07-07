// 响应面板组件
import { createMemo, For, Show } from "solid-js"

import { CodeEditor, type CodeLanguage } from "@/components/ui/code-editor"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { decodeRawBody, formatBody } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { ResponseData, ScriptRunResult } from "./EndpointDetail"

/** 渲染模式选项（直接展示的按钮组） */
const renderModes = [
  { value: "pretty", label: () => t("response.pretty") },
  { value: "raw", label: () => t("response.raw") },
  { value: "preview", label: () => t("response.preview") },
] as const

/** 格式化方式选项 */
const formatOptions = [
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
]

/** 编码选项 */
const encodingOptions = [
  { value: "utf-8", label: "UTF-8" },
  { value: "gbk", label: "GBK" },
  { value: "gb2312", label: "GB2312" },
  { value: "iso-8859-1", label: "ISO-8859-1" },
]

/**
 * 响应体渲染工具栏：渲染模式（格式化/原始/预览）+ 格式方案 + 编码切换。
 * 受控组件，可被内嵌于响应面板内（左右布局）或标签栏状态码左侧（上下布局）。
 */
export interface ResponseBodyToolbarProps {
  renderMode: string
  onRenderModeChange: (v: string) => void
  format: string
  onFormatChange: (v: string) => void
  encoding: string
  onEncodingChange: (v: string) => void
  class?: string
}

export function ResponseBodyToolbar(props: ResponseBodyToolbarProps) {
  return (
    // 顺序反向：编码 / 格式选择器在左，渲染模式切换器在右。
    // 使切换「格式化 / 原始 / 预览」时，左侧两个选择器的显隐不再挤动右侧的渲染模式切换器位置。
    <div class={cn("flex items-center gap-1", props.class)}>
      {/* 编码选择（格式化和原始模式可用） */}
      <Show when={props.renderMode === "pretty" || props.renderMode === "raw"}>
        <Select options={encodingOptions} value={props.encoding} onChange={props.onEncodingChange} size="sm" class="w-24" />
      </Show>
      {/* 格式选择（仅格式化模式可用） */}
      <Show when={props.renderMode === "pretty"}>
        <Select options={formatOptions} value={props.format} onChange={props.onFormatChange} size="sm" class="w-20" />
      </Show>
      {/* 渲染模式按钮组 */}
      <div class="flex items-center rounded-md border border-border overflow-hidden">
        <For each={renderModes}>
          {(mode) => (
            <button
              class={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                props.renderMode === mode.value
                  ? "bg-accent text-white"
                  : "bg-transparent text-muted-foreground hover:bg-accent-muted hover:text-accent",
              )}
              onClick={() => props.onRenderModeChange(mode.value)}
            >
              {mode.label()}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}

export interface ResponsePanelProps {
  tab: string
  response: ResponseData
  /** 渲染模式：pretty / raw / preview（受控，由父级持有以便工具栏可移出面板） */
  renderMode: string
  /** 格式方案：json / xml / html */
  format: string
  /** 编码：utf-8 / gbk / ... */
  encoding: string
  /** 是否在面板内以独立一行渲染工具栏（左右布局为 true；上下布局工具栏移入标签栏，故为 false） */
  showToolbar?: boolean
  onRenderModeChange: (v: string) => void
  onFormatChange: (v: string) => void
  onEncodingChange: (v: string) => void
}

export function ResponsePanel(props: ResponsePanelProps) {
  // 按所选字符集解码响应体：utf-8 直接用 body；其他用 rawBody 解码，失败回退 body
  const decodedBody = createMemo(() => {
    if (props.encoding === "utf-8") return props.response.body
    const decoded = props.response.rawBody ? decodeRawBody(props.response.rawBody, props.encoding) : null
    return decoded ?? props.response.body
  })
  // pretty 模式下再按所选格式美化
  const displayBody = createMemo(() => props.renderMode === "pretty" ? formatBody(decodedBody(), props.format) : decodedBody())
  // 格式化模式下按所选格式切换 CodeMirror 高亮方案
  const bodyLanguage = (): CodeLanguage => {
    switch (props.format) {
      case "xml": return "xml"
      case "html": return "html"
      default: return "json"
    }
  }

  return (
    <div class="h-full flex flex-col">
      <Show when={props.tab === "body"}>
        {/* 渲染工具栏（仅左右布局时内嵌显示；上下布局由父级移入标签栏状态码左侧） */}
        <Show when={props.showToolbar}>
          {/* 右对齐：渲染模式切换器固定在右端，切换时左侧选择器显隐不影响其位置 */}
          <div class="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-border shrink-0">
            <ResponseBodyToolbar
              renderMode={props.renderMode}
              onRenderModeChange={props.onRenderModeChange}
              format={props.format}
              onFormatChange={props.onFormatChange}
              encoding={props.encoding}
              onEncodingChange={props.onEncodingChange}
            />
          </div>
        </Show>
        {/* 响应体内容 */}
        <div class="flex-1 min-h-0 overflow-hidden">
          <Show
            when={props.renderMode === "preview"}
            fallback={
              <Show when={displayBody()} fallback={<div class="p-3 text-sm text-muted-foreground">{t("response.empty")}</div>}>
                {/* 格式化/原始：CodeMirror 语法高亮，按所选格式切换高亮方案 */}
                <CodeEditor
                  value={displayBody()}
                  language={props.renderMode === "raw" ? "text" : bodyLanguage()}
                  readOnly
                  class="h-full border-0 rounded-none bg-transparent"
                />
              </Show>
            }
          >
            <div class="h-full overflow-auto p-3">
              {/* 预览模式：按 Content-Type 渲染 图片 / PDF / 音频 / 视频 / HTML / XML(SVG) */}
              {(() => {
                const ct = (props.response.contentType || "").toLowerCase()
                const raw = props.response.rawBody || ""
                const dataUri = raw ? `data:${ct.split(";")[0] || "application/octet-stream"};base64,${raw}` : ""
                if (ct.startsWith("image/")) {
                  return <img src={dataUri} alt="preview" class="max-w-full max-h-full object-contain mx-auto" />
                }
                if (ct.includes("pdf")) {
                  return <iframe class="w-full h-full min-h-96 border rounded bg-white" src={dataUri} title="PDF" />
                }
                if (ct.startsWith("audio/")) {
                  return <audio controls src={dataUri} class="w-full mt-4" />
                }
                if (ct.startsWith("video/")) {
                  return <video controls src={dataUri} class="max-w-full max-h-full mx-auto" />
                }
                // HTML / XML / SVG 等：用 iframe + srcdoc 渲染。
                // sandbox="" 施加全部限制：禁用脚本、表单、弹窗、同源等，
                // 保证预览响应体时绝不执行其中的 JavaScript。
                return (
                  <Show when={decodedBody()} fallback={<div class="text-muted-foreground">{t("response.empty")}</div>}>
                    <iframe
                      class="w-full h-full min-h-48 border rounded bg-white"
                      srcdoc={decodedBody()}
                      sandbox=""
                      referrerpolicy="no-referrer"
                      title="Preview"
                    />
                  </Show>
                )
              })()}
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.tab === "headers"}>
        <div class="overflow-auto">
          <Table
            columns={[
              { header: t("common.name"), field: "name" },
              { header: t("common.value"), field: "value" },
            ]}
            data={Object.entries(props.response.headers || {}).map(([name, values]) => ({
              name,
              value: Array.isArray(values) ? values.join(", ") : values,
            }))}
            compact
          />
        </div>
      </Show>

      <Show when={props.tab === "cookies"}>
        <div class="overflow-auto">
          <Table
            columns={[
              { header: t("common.name"), field: "name" },
              { header: t("common.value"), field: "value" },
              { header: t("cookie.domain"), field: "domain" },
              { header: t("cookie.path"), field: "path" },
              { header: t("cookie.expires"), field: "expires" },
            ]}
            data={(props.response.cookies || []) as any[]}
            compact
          />
        </div>
      </Show>

      <Show when={props.tab === "scripts"}>
        <div class="flex-1 overflow-auto p-3">
          <Show
            when={props.response.scripts?.preRequest || props.response.scripts?.postResponse}
            fallback={<div class="text-sm text-muted-foreground">{t("script.noOutput")}</div>}
          >
            <div class="flex flex-col gap-4">
              <Show when={props.response.scripts?.preRequest}>
                <ScriptResultBlock label={t("script.preRequest")} result={props.response.scripts!.preRequest!} />
              </Show>
              <Show when={props.response.scripts?.postResponse}>
                <ScriptResultBlock label={t("script.postResponse")} result={props.response.scripts!.postResponse!} />
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.tab === "actualRequest"}>
        <div class="p-3 overflow-auto">
          <pre class="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
            {JSON.stringify(props.response.actualRequest, null, 2)}
          </pre>
        </div>
      </Show>
    </div>
  )
}

/** 单个脚本执行结果块：标题 + 断言列表 + 控制台输出 + 错误 */
function ScriptResultBlock(props: { label: string; result: ScriptRunResult }) {
  const r = () => props.result
  return (
    <div class="border border-border rounded-md overflow-hidden">
      {/* 标题栏 */}
      <div class="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border text-sm">
        <span class="font-medium">{props.label}</span>
        <span class="text-xs text-muted-foreground">{t("script.durationMs", { ms: r().duration ?? 0 })}</span>
      </div>
      <div class="p-3 flex flex-col gap-3">
        {/* 执行错误 */}
        <Show when={r().error}>
          <div class="text-xs">
            <div class="font-medium text-red-600 dark:text-red-400 mb-1">{t("script.error")}</div>
            <pre class="font-mono whitespace-pre-wrap break-all text-red-600 dark:text-red-400">{r().error}</pre>
          </div>
        </Show>

        {/* 断言结果 */}
        <Show when={r().tests && r().tests.length > 0}>
          <div class="flex flex-col gap-1">
            <div class="text-xs font-medium text-muted-foreground">{t("script.tests")}</div>
            <For each={r().tests}>
              {(test) => (
                <div class="flex items-start gap-2 text-sm">
                  <span
                    class={cn(
                      "shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium",
                      test.passed
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400",
                    )}
                  >
                    {test.passed ? t("script.passed") : t("script.failed")}
                  </span>
                  <div class="min-w-0">
                    <span class="break-all">{test.name}</span>
                    <Show when={!test.passed && test.error}>
                      <pre class="mt-0.5 text-xs font-mono whitespace-pre-wrap break-all text-red-600 dark:text-red-400">{test.error}</pre>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* 控制台输出 */}
        <Show when={r().logs && r().logs.length > 0}>
          <div class="flex flex-col gap-1">
            <div class="text-xs font-medium text-muted-foreground">{t("script.logs")}</div>
            <div class="rounded bg-muted/40 p-2 flex flex-col gap-0.5">
              <For each={r().logs}>
                {(log) => (
                  <pre
                    class={cn(
                      "text-xs font-mono whitespace-pre-wrap break-all",
                      log.level === "error"
                        ? "text-red-600 dark:text-red-400"
                        : log.level === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground",
                    )}
                  >
                    {log.message}
                  </pre>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
