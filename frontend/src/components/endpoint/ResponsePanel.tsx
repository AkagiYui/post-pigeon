// 响应面板组件
import { createSignal, For, Show } from "solid-js"

import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

import type { ResponseData } from "./EndpointDetail"

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

export interface ResponsePanelProps {
  tab: string
  response: ResponseData
}

export function ResponsePanel(props: ResponsePanelProps) {
  const [renderMode, setRenderMode] = createSignal("pretty")
  const [format, setFormat] = createSignal("json")
  const [encoding, setEncoding] = createSignal("utf-8")

  return (
    <div class="h-full flex flex-col">
      <Show when={props.tab === "body"}>
        {/* 渲染工具栏 */}
        <div class="flex items-center gap-1 px-3 py-1.5 border-b border-border shrink-0">
          {/* 渲染模式按钮组 */}
          <div class="flex items-center rounded-md border border-border overflow-hidden">
            <For each={renderModes}>
              {(mode) => (
                <button
                  class={cn(
                    "px-2.5 py-1 text-xs font-medium transition-colors",
                    renderMode() === mode.value
                      ? "bg-accent text-white"
                      : "bg-transparent text-muted-foreground hover:bg-accent-muted hover:text-accent",
                  )}
                  onClick={() => setRenderMode(mode.value)}
                >
                  {mode.label()}
                </button>
              )}
            </For>
          </div>
          {/* 格式选择（仅格式化模式可用） */}
          <Show when={renderMode() === "pretty"}>
            <Select options={formatOptions} value={format()} onChange={setFormat} size="sm" class="w-20" />
          </Show>
          {/* 编码选择（格式化和原始模式可用） */}
          <Show when={renderMode() === "pretty" || renderMode() === "raw"}>
            <Select options={encodingOptions} value={encoding()} onChange={setEncoding} size="sm" class="w-24" />
          </Show>
        </div>
        {/* 响应体内容 */}
        <div class="flex-1 overflow-auto p-3">
          <Show
            when={renderMode() === "preview"}
            fallback={
              <pre class="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                {props.response.body || t("response.empty")}
              </pre>
            }
          >
            {/* 预览模式：使用 iframe 渲染 HTML */}
            <Show when={props.response.body} fallback={<div class="text-muted-foreground">{t("response.empty")}</div>}>
              <iframe
                class="w-full h-full min-h-48 border rounded bg-white"
                srcdoc={props.response.body}
                sandbox="allow-same-origin"
                title="Preview"
              />
            </Show>
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
