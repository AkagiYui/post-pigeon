// 端点详情组件 - 上中下结构
// 上：请求方法 + URL + 发送/保存/删除按钮
// 中：请求设置 tabs (Params/Body/Headers/Auth/设置)
// 下：响应信息 tabs (Body/Headers/Cookies/实际请求)
import { Save, Send, Trash2 } from "lucide-solid"
import { createEffect, createSignal, on, Show } from "solid-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Tabs } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { type BodyType, CONTENT_TYPES, formatSize, formatTiming, getStatusColor, type HTTPMethod, METHOD_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

import { AuthEditor } from "./AuthEditor"
import { BodyEditor } from "./BodyEditor"
import { EndpointSettingsEditor } from "./EndpointSettingsEditor"
import { HeadersEditor } from "./HeadersEditor"
import { ParamsEditor } from "./ParamsEditor"
import { ResponsePanel } from "./ResponsePanel"

/** HTTP 方法选项（用于 Combobox） */
const methodOptions: ComboboxOption[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
  { value: "HEAD", label: "HEAD" },
  { value: "OPTIONS", label: "OPTIONS" },
]

/** HTTP 方法颜色映射（输入框背景：文字颜色 + 半透明背景） */
const methodColors: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400 bg-green-500/10",
  POST: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10",
  PUT: "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10",
  DELETE: "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-400/10",
  PATCH: "text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-400/10",
  HEAD: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-400/10",
  OPTIONS: "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10",
}

/** 自定义方法的默认颜色 */
const defaultMethodColor = "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-400/10"

/** 请求设置标签 */
function getRequestTabs() {
  return [
    { key: "params", label: t("endpoint.params") },
    { key: "body", label: t("endpoint.body") },
    { key: "headers", label: t("endpoint.headers") },
    { key: "auth", label: t("endpoint.auth") },
    { key: "settings", label: t("endpoint.settings") },
  ]
}

/** 响应标签 */
function getResponseTabs() {
  return [
    { key: "body", label: t("response.body") },
    { key: "headers", label: t("response.headers") },
    { key: "cookies", label: t("response.cookies") },
    { key: "actualRequest", label: t("response.actualRequest") },
  ]
}

export interface EndpointData {
  id: string
  name: string
  method: HTTPMethod
  path: string
  bodyType: BodyType
  bodyContent: string
  contentType: string
  timeout: number
  followRedirects: boolean
  baseUrl: string
}

export interface ResponseData {
  statusCode: number
  timing: { total: number; dnsLookup: number; tlsHandshake: number; tcpConnect: number; ttfb: number }
  size: number
  body: string
  headers: Record<string, string[]>
  cookies: any[]
  contentType: string
  actualRequest: any
}

export interface EndpointDetailProps {
  /** 端点数据 */
  endpoint: EndpointData
  /** 响应数据 */
  response?: ResponseData | null
  /** 是否正在发送请求 */
  sending?: boolean
  /** 是否为未保存请求 */
  isUnsaved?: boolean
  /** 发送请求回调 */
  onSend?: () => void
  /** 保存回调 */
  onSave?: () => void
  /** 删除回调 */
  onDelete?: () => void
  /** 数据变更回调 */
  onChange?: (data: Partial<EndpointData>) => void
}

// 按端点 ID 持久化标签页状态，避免组件重新挂载时丢失
const tabStateStore = new Map<string, { requestTab: string; responseTab: string }>()

/**
 * EndpointDetail 端点详情组件
 */
export function EndpointDetail(props: EndpointDetailProps) {
  const ep = () => props.endpoint

  // 初始化标签页状态（从持久化存储恢复，或使用默认值）
  const [activeRequestTab, setActiveRequestTab] = createSignal("params")
  const [activeResponseTab, setActiveResponseTab] = createSignal("body")

  // 初始化标签页状态（从持久化存储恢复，或使用默认值）
  createEffect(on(
    () => ep().id,
    (id) => {
      const saved = tabStateStore.get(id)
      if (saved) {
        setActiveRequestTab(saved.requestTab)
        setActiveResponseTab(saved.responseTab)
      } else {
        setActiveRequestTab("params")
        setActiveResponseTab("body")
      }
    },
  ))

  // 标签页变化时，保存到持久化存储（仅跟踪标签变化，不跟踪端点 ID 变化）
  createEffect(on(
    () => [activeRequestTab(), activeResponseTab()],
    ([requestTab, responseTab]) => {
      tabStateStore.set(ep().id, { requestTab, responseTab })
    },
  ))

  return (
    <div class="flex flex-col h-full">
      {/* 上部：请求行 */}
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        {/* 内嵌方法选择器的 URL 输入组 */}
        <div class="flex-1 flex items-stretch border border-border rounded-md bg-input">
          {/* HTTP 方法选择器（Combobox：点击后弹出空白输入框，支持搜索筛选和自定义输入） */}
          <Combobox
            options={methodOptions}
            value={ep().method}
            onChange={(val) => props.onChange?.({ method: val as HTTPMethod })}
            minWidth="68px"
            customLabel={(val) => val}
            displayClass={methodColors[ep().method] || defaultMethodColor}
            class="rounded-l shrink-0"
          />

          {/* 分隔线 */}
          <div class="w-px self-stretch bg-border shrink-0" />

          {/* 前置 baseUrl */}
          <Show when={ep().baseUrl}>
            <Input
              size="sm"
              value={ep().baseUrl}
              class="border-0 bg-transparent max-w-50 rounded-none"
              readOnly
            />
            <div class="w-px self-stretch bg-border shrink-0" />
          </Show>

          {/* 端点路径 */}
          <Input
            size="sm"
            value={ep().path}
            onInput={(e) => props.onChange?.({ path: e.currentTarget.value })}
            placeholder="/api/endpoint"
            class="border-0 bg-transparent rounded-none flex-1 min-w-0"
          />
        </div>

        {/* 操作按钮 */}
        <Tooltip content="Ctrl+Enter">
          <Button size="sm" onClick={props.onSend} disabled={props.sending}>
            <Send class="h-3.5 w-3.5" />
            {props.sending ? t("common.sending") : t("endpoint.send")}
          </Button>
        </Tooltip>
        <Button variant={props.isUnsaved ? "default" : "outline"} size="sm" onClick={props.onSave}>
          <Save class="h-3.5 w-3.5" />
          {props.isUnsaved ? t("endpoint.saveToProject") : t("endpoint.save")}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onDelete}>
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 中部：请求设置 */}
      <div class="flex-1 overflow-hidden border-b border-border">
        <Tabs
          tabs={getRequestTabs()}
          value={activeRequestTab()}
          onChange={setActiveRequestTab}
        >
          {(key) => {
            switch (key) {
              case "params": return <ParamsEditor />
              case "body": return <BodyEditor bodyType={ep().bodyType} onChange={(bt) => props.onChange?.({ bodyType: bt })} />
              case "headers": return <HeadersEditor />
              case "auth": return <AuthEditor />
              case "settings": return <EndpointSettingsEditor timeout={ep().timeout} followRedirects={ep().followRedirects} />
              default: return null
            }
          }}
        </Tabs>
      </div>

      {/* 下部：响应信息 */}
      <div class="flex-1 overflow-hidden min-h-50">
        <Show
          when={props.response}
          fallback={
            <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t("endpoint.sendToViewResponse")}
            </div>
          }
        >
          <Tabs
            tabs={getResponseTabs()}
            value={activeResponseTab()}
            onChange={setActiveResponseTab}
            extra={
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge class={getStatusColor(props.response!.statusCode)}>
                  {props.response!.statusCode}
                </Badge>
                <span>{formatTiming(props.response!.timing?.total || 0)}</span>
                <span>{formatSize(props.response!.size || 0)}</span>
              </div>
            }
          >
            {(key) => (
              <ResponsePanel
                tab={key}
                response={props.response!}
              />
            )}
          </Tabs>
        </Show>
      </div>
    </div>
  )
}
