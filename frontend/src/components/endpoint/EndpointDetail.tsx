// 端点详情组件 - 上中下结构
// 上：请求方法 + URL + 发送/保存/删除按钮
// 中：请求设置 tabs (Params/Body/Headers/Auth/设置)
// 下：响应信息 tabs (Body/Headers/Cookies/实际请求)
import { Save, Send, Trash2 } from "lucide-solid"
import { createEffect, createSignal, For, on, Show } from "solid-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
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

/** HTTP 方法选项 */
const methodOptions = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
  { value: "HEAD", label: "HEAD" },
  { value: "OPTIONS", label: "OPTIONS" },
]

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

  // 端点切换时，从持久化存储中恢复对应的标签页状态
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
        {/* HTTP 方法选择 */}
        <Select
          options={methodOptions}
          value={ep().method}
          onChange={(v) => props.onChange?.({ method: v as HTTPMethod })}
          size="sm"
          class="w-24"
        />

        {/* 前置 URL + Path */}
        <div class="flex-1 flex items-center">
          <Show when={ep().baseUrl}>
            <Input
              size="sm"
              value={ep().baseUrl}
              class="max-w-50 rounded-r-none border-r-0 bg-muted/50"
              readOnly
            />
          </Show>
          <Input
            size="sm"
            value={ep().path}
            onInput={(e) => props.onChange?.({ path: e.currentTarget.value })}
            placeholder="/api/endpoint"
            class={cn(ep().baseUrl && "rounded-l-none")}
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
