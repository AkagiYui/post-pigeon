// 请求历史详情组件
import { Clock } from "lucide-solid"
import { createSignal, For, Match, onMount, Show, Switch } from "solid-js"

import type { RequestHistory } from "@/../bindings/post-pigeon/internal/models"
import { RequestHistoryService } from "@/../bindings/post-pigeon/internal/services"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Tabs } from "@/components/ui/tabs"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

export interface HistoryDetailProps {
  historyId: string
}

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
 * HistoryDetail 请求历史详情
 */
export function HistoryDetail(props: HistoryDetailProps) {
  const [detail, setDetail] = createSignal<RequestHistory | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [tab, setTab] = createSignal("response")
  const [responseTab, setResponseTab] = createSignal("body")
  const [requestTab, setRequestTab] = createSignal("body")
  const [renderMode, setRenderMode] = createSignal("pretty")
  const [format, setFormat] = createSignal("json")
  const [encoding, setEncoding] = createSignal("utf-8")

  // 加载详情
  onMount(async () => {
    try {
      setLoading(true)
      const data = await RequestHistoryService.GetHistory(props.historyId)
      setDetail(data)
    } catch (e) {
      console.error("加载请求历史详情失败", e)
    } finally {
      setLoading(false)
    }
  })

  // 格式化时间
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  // 格式化大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 获取状态码颜色
  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    if (code >= 300 && code < 400) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    if (code >= 400 && code < 500) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    if (code >= 500) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    return "bg-gray-100 text-gray-700"
  }

  // 格式化 JSON
  const formatJson = (str: string) => {
    if (!str) return ""
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  // 解析 JSON 字符串为对象
  const parseJsonToRecords = (str: string): { name: string; value: string }[] => {
    if (!str) return []
    try {
      const obj = JSON.parse(str)
      if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj).map(([name, value]) => ({
          name,
          value: typeof value === "object" ? JSON.stringify(value) : String(value),
        }))
      }
    } catch {
      // 解析失败
    }
    return []
  }

  // 解析计时信息
  const parseTiming = (str: string) => {
    if (!str) return null
    try {
      return JSON.parse(str)
    } catch {
      return null
    }
  }

  return (
    <Show
      when={!loading() && detail()}
      fallback={
        <div class="flex items-center justify-center h-full text-muted-foreground">
          {t("app.loading")}
        </div>
      }
    >
      <div class="flex flex-col h-full">
        {/* 顶部信息栏 */}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Badge class={cn("text-base font-medium", getStatusCodeColor(detail()!.statusCode))}>
            {detail()!.statusCode}
          </Badge>
          <div class="flex-1">
            <div class="text-sm font-medium">{detail()!.method} {detail()!.url}</div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {formatTime(detail()!.createdAt as any)}
              </span>
              <span>{formatSize(detail()!.size)}</span>
              <Show when={parseTiming(detail()!.timing)}>
                {(timing) => <span>{t("history.totalTime", { time: timing().total })}</span>}
              </Show>
            </div>
          </div>
        </div>

        {/* 主 Tab 内容区 */}
        <div class="flex-1 overflow-hidden">
          <Tabs
            tabs={[
              { key: "response", label: t("history.response") },
              { key: "request", label: t("history.request") },
            ]}
            value={tab()}
            onChange={setTab}
          >
            {() => (
              <div class="h-full overflow-hidden">
                <Switch>
                  {/* 响应详情 */}
                  <Match when={tab() === "response"}>
                    <div class="flex flex-col h-full">
                      <Tabs
                        tabs={[
                          { key: "body", label: t("response.body") },
                          { key: "headers", label: t("response.headers") },
                          { key: "timing", label: t("history.timingInfo") },
                        ]}
                        value={responseTab()}
                        onChange={setResponseTab}
                      >
                        {() => (
                          <div class="flex-1 overflow-auto">
                            <Switch>
                              <Match when={responseTab() === "body"}>
                                <div class="flex flex-col h-full">
                                  {/* 渲染模式工具栏 */}
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
                                          <Show when={detail()!.responseBody} fallback={t("response.empty")}>
                                            {renderMode() === "pretty" && format() === "json" ? formatJson(detail()!.responseBody) : detail()!.responseBody}
                                          </Show>
                                        </pre>
                                      }
                                    >
                                      {/* 预览模式：使用 iframe 渲染 HTML */}
                                      <Show when={detail()!.responseBody} fallback={<div class="text-muted-foreground">{t("response.empty")}</div>}>
                                        <iframe
                                          class="w-full h-full min-h-48 border rounded bg-white"
                                          srcdoc={detail()!.responseBody}
                                          sandbox="allow-same-origin"
                                          title="Preview"
                                        />
                                      </Show>
                                    </Show>
                                  </div>
                                </div>
                              </Match>

                              <Match when={responseTab() === "headers"}>
                                <div class="p-3">
                                  <Table
                                    columns={[
                                      { header: t("common.name"), field: "name" },
                                      { header: t("common.value"), field: "value" },
                                    ]}
                                    data={parseJsonToRecords(detail()!.responseHeaders)}
                                    compact
                                  />
                                </div>
                              </Match>

                              <Match when={responseTab() === "timing"}>
                                <div class="p-3">
                                  <Show when={parseTiming(detail()!.timing)} fallback={<div class="text-muted-foreground">{t("common.noData")}</div>}>
                                    {(timing) => (
                                      <Table
                                        columns={[
                                          { header: t("history.timing.total"), field: "total" },
                                          { header: t("history.timing.dns"), field: "dnsLookup" },
                                          { header: t("history.timing.tcp"), field: "tcpConnect" },
                                          { header: t("history.timing.tls"), field: "tlsHandshake" },
                                          { header: t("history.timing.ttfb"), field: "ttfb" },
                                        ]}
                                        data={[{
                                          total: `${timing().total}ms`,
                                          dnsLookup: `${timing().dnsLookup}ms`,
                                          tcpConnect: `${timing().tcpConnect}ms`,
                                          tlsHandshake: `${timing().tlsHandshake}ms`,
                                          ttfb: `${timing().ttfb}ms`,
                                        }]}
                                        compact
                                      />
                                    )}
                                  </Show>
                                </div>
                              </Match>
                            </Switch>
                          </div>
                        )}
                      </Tabs>
                    </div>
                  </Match>

                  {/* 请求详情 */}
                  <Match when={tab() === "request"}>
                    <div class="flex flex-col h-full">
                      <Tabs
                        tabs={[
                          { key: "body", label: t("endpoint.body") },
                          { key: "headers", label: t("endpoint.headers") },
                        ]}
                        value={requestTab()}
                        onChange={setRequestTab}
                      >
                        {() => (
                          <div class="flex-1 overflow-auto">
                            <Switch>
                              <Match when={requestTab() === "body"}>
                                <div class="p-3">
                                  <pre class="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                                    <Show when={detail()!.requestBody} fallback={t("endpoint.body.none")}>
                                      {formatJson(detail()!.requestBody)}
                                    </Show>
                                  </pre>
                                </div>
                              </Match>

                              <Match when={requestTab() === "headers"}>
                                <div class="p-3">
                                  <Table
                                    columns={[
                                      { header: t("common.name"), field: "name" },
                                      { header: t("common.value"), field: "value" },
                                    ]}
                                    data={parseJsonToRecords(detail()!.requestHeaders)}
                                    compact
                                  />
                                </div>
                              </Match>
                            </Switch>
                          </div>
                        )}
                      </Tabs>
                    </div>
                  </Match>
                </Switch>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </Show>
  )
}
