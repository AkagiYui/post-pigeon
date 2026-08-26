// 端点设置编辑器：超时、重定向、代理，以及接口元数据（状态 / 标签 / 描述）
import { createEffect, createSignal, on } from "solid-js"

import { SelectableProxy } from "@/../bindings/PostPigeon/internal/models"
import { ProxyService } from "@/../bindings/PostPigeon/internal/services"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { toastError } from "@/stores/toast"

export interface EndpointSettingsEditorProps {
  timeout: number
  /** 跟随重定向：null 表示继承上级（全局设置） */
  followRedirects: boolean | null
  /** 接口状态：developing / testing / released / deprecated */
  status: string
  /** 标签（JSON 字符串数组） */
  tags: string
  /** 接口描述 */
  description: string
  /** 接口级代理选择（EndpointProxy 的 JSON，空表示 inherit 跟随项目） */
  proxyConfig?: string
  /** 接口级 TLS 选择（EndpointTLS 的 JSON，空表示 inherit 跟随项目） */
  tlsConfig?: string
  /** 所属项目 ID，用于拉取可选代理列表 */
  projectId?: string
  onChange?: (data: {
    timeout?: number
    followRedirects?: boolean | null
    status?: string
    tags?: string
    description?: string
    proxyConfig?: string
    tlsConfig?: string
  }) => void
}

/** 将接口 TLS JSON 转为下拉选择的 key */
function tlsModeFromJSON(json?: string): string {
  if (!json || !json.trim()) return "inherit"
  try {
    const parsed = JSON.parse(json) as { mode?: string }
    return parsed.mode === "strict" || parsed.mode === "insecure" ? parsed.mode : "inherit"
  } catch {
    return "inherit"
  }
}

/** 将下拉选择的 key 转回接口 TLS JSON（inherit 存空串） */
function tlsJSONFromMode(mode: string): string {
  return mode === "strict" || mode === "insecure" ? JSON.stringify({ mode }) : ""
}

/** 接口级跟随重定向选项：继承上级 / 显式开启 / 显式关闭 */
const followRedirectsOptions = () => [
  { value: "inherit", label: t("endpoint.followRedirects.inherit") },
  { value: "true", label: t("endpoint.followRedirects.on") },
  { value: "false", label: t("endpoint.followRedirects.off") },
]

/** 接口级证书校验选项 */
const tlsOptions = () => [
  { value: "inherit", label: t("tls.endpoint.inherit") },
  { value: "strict", label: t("tls.endpoint.strict") },
  { value: "insecure", label: t("tls.endpoint.insecure") },
]

/** 将接口代理 JSON 转为下拉选择的 key */
function proxyKeyFromJSON(json?: string): string {
  if (!json || !json.trim()) return "inherit"
  try {
    const p = JSON.parse(json)
    if (p.mode === "none") return "none"
    if (p.mode === "ref" && p.refScope && p.refId) return `ref:${p.refScope}:${p.refId}`
    return "inherit"
  } catch {
    return "inherit"
  }
}

/** 将下拉选择的 key 转回接口代理 JSON（inherit 存空串） */
function proxyJSONFromKey(key: string): string {
  if (key === "none") return JSON.stringify({ mode: "none" })
  if (key.startsWith("ref:")) {
    const parts = key.split(":")
    return JSON.stringify({ mode: "ref", refScope: parts[1], refId: parts.slice(2).join(":") })
  }
  return "" // inherit
}

/** 接口状态选项 */
const statusOptions = () => [
  { value: "", label: t("endpoint.status.none") },
  { value: "designing", label: t("endpoint.status.designing") },
  { value: "developing", label: t("endpoint.status.developing") },
  { value: "testing", label: t("endpoint.status.testing") },
  { value: "released", label: t("endpoint.status.released") },
  { value: "deprecated", label: t("endpoint.status.deprecated") },
]

/** 标签：JSON 数组字符串 <-> 逗号分隔文本 互转 */
function tagsToText(json: string): string {
  try {
    const arr = JSON.parse(json || "[]")
    return Array.isArray(arr) ? arr.join(", ") : ""
  } catch {
    return ""
  }
}
function textToTags(text: string): string {
  const arr = text.split(",").map(s => s.trim()).filter(Boolean)
  return arr.length ? JSON.stringify(arr) : ""
}

export function EndpointSettingsEditor(props: EndpointSettingsEditorProps) {
  const [selectable, setSelectable] = createSignal<SelectableProxy[]>([])

  // 拉取可选代理列表（项目 + 全局，含内置条目）
  createEffect(on(() => props.projectId, async (pid) => {
    try {
      const list = await ProxyService.ListSelectableProxies(pid || "")
      setSelectable(list || [])
    } catch (e) {
      toastError(e, "error.op.loadFailed")
      setSelectable([])
    }
  }))

  // 代理下拉选项：跟随项目 / 不使用 / 引用项目或全局中的具体条目
  const proxyOptions = () => {
    const scopeLabel = (s: string) => s === "project" ? t("proxy.scope.project") : t("proxy.scope.global")
    return [
      { value: "inherit", label: t("proxy.endpoint.inherit") },
      { value: "none", label: t("proxy.endpoint.none") },
      ...selectable().map(p => ({ value: `ref:${p.scope}:${p.id}`, label: `${scopeLabel(p.scope)} / ${p.name}` })),
    ]
  }

  return (
    <div class="p-3 space-y-4 overflow-auto h-full">
      {/* 接口元数据 */}
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.statusLabel")}</label>
        <Select
          options={statusOptions()}
          value={props.status || ""}
          onChange={(v) => props.onChange?.({ status: v })}
          size="sm"
          class="w-40"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.tags")}</label>
        <Input
          size="sm"
          value={tagsToText(props.tags)}
          onInput={(e) => props.onChange?.({ tags: textToTags(e.currentTarget.value) })}
          placeholder={t("endpoint.tagsPlaceholder")}
          class="flex-1"
        />
      </div>
      <div class="flex items-start gap-3">
        <label class="text-sm font-medium w-28 shrink-0 pt-1.5">{t("endpoint.description")}</label>
        <Textarea
          value={props.description || ""}
          onInput={(e) => props.onChange?.({ description: e.currentTarget.value })}
          placeholder={t("endpoint.descriptionPlaceholder")}
          rows={3}
          class="flex-1 resize-y min-h-16 px-2 py-1.5"
        />
      </div>

      <div class="h-px bg-border" />

      {/* 请求设置 */}
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.timeout")} (ms)</label>
        <Input
          type="number"
          value={props.timeout.toString()}
          onInput={(e) => props.onChange?.({ timeout: parseInt(e.currentTarget.value) || 30000 })}
          class="w-32"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("endpoint.followRedirects")}</label>
        <Select
          options={followRedirectsOptions()}
          value={props.followRedirects == null ? "inherit" : String(props.followRedirects)}
          onChange={(v) => props.onChange?.({ followRedirects: v === "inherit" ? null : v === "true" })}
          size="sm"
          class="w-64"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("proxy.endpoint.label")}</label>
        <Select
          options={proxyOptions()}
          value={proxyKeyFromJSON(props.proxyConfig)}
          onChange={(v) => props.onChange?.({ proxyConfig: proxyJSONFromKey(v) })}
          size="sm"
          class="w-64"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium w-28 shrink-0">{t("tls.endpoint.label")}</label>
        <Select
          options={tlsOptions()}
          value={tlsModeFromJSON(props.tlsConfig)}
          onChange={(v) => props.onChange?.({ tlsConfig: tlsJSONFromMode(v) })}
          size="sm"
          class="w-64"
        />
      </div>
    </div>
  )
}
