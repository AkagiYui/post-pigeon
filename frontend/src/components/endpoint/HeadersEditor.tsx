// 请求头编辑器（受控组件）
// 与参数编辑器共用 KeyValueTable：末行草稿行直接录入、hover 显删除、支持批量编辑。
import { Show } from "solid-js"

import type { HeaderRow } from "@/components/endpoint/EndpointDetail"
import { KeyValueTable } from "@/components/endpoint/KeyValueTable"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import type { BodyType } from "@/lib/types"

export interface HeadersEditorProps {
  value: HeaderRow[]
  bodyType: BodyType
  contentType: string
  onChange: (rows: HeaderRow[]) => void
}

const commonHeaderNames = [
  "Accept", "Accept-Encoding", "Accept-Language", "Authorization", "Cache-Control",
  "Content-Type", "Cookie", "If-Match", "If-Modified-Since", "If-None-Match",
  "Origin", "Pragma", "Range", "Referer", "User-Agent", "X-API-Key",
  "X-Forwarded-For", "X-Request-ID",
]

export function systemContentType(bodyType: BodyType, configured: string): string {
  if (bodyType === "none") return ""
  if (bodyType === "form-data") return "multipart/form-data; boundary=<auto>"
  if (bodyType === "x-www-form-urlencoded") return "application/x-www-form-urlencoded"
  if (configured.trim()) return configured.trim()
  switch (bodyType) {
    case "json":
    case "graphql": return "application/json"
    case "xml": return "application/xml"
    case "text": return "text/plain"
    case "binary": return "application/octet-stream"
    default: return ""
  }
}

/** 构造一行空请求头 */
function makeRow(): HeaderRow {
  return {
    id: crypto.randomUUID(), name: "", value: "", description: "",
    enabled: true, required: false, example: "",
  }
}

export function HeadersEditor(props: HeadersEditorProps) {
  const automaticContentType = () => systemContentType(props.bodyType, props.contentType)
  return (
    <div class="h-full overflow-auto p-3 space-y-5">
      <Show when={automaticContentType()}>
        <section>
          <h3 class="mb-2 text-sm font-medium text-foreground">{t("endpoint.header.system")}</h3>
          <Table
            data={[{ id: "__system_content_type", name: "Content-Type", value: automaticContentType() }]}
            columns={[
              { header: "", width: "32px", render: () => <Checkbox checked disabled aria-label={t("endpoint.header.systemGenerated")} /> },
              { header: t("common.name"), render: row => <Input size="sm" value={row.name} readOnly class="border-transparent bg-transparent font-mono" /> },
              { header: t("common.value"), render: row => <Input size="sm" value={row.value} readOnly class="border-transparent bg-transparent font-mono" /> },
              { header: t("common.type"), width: "96px", render: () => <span class="px-2 text-xs text-muted-foreground">String</span> },
              { header: t("endpoint.param.description"), render: () => <span class="px-2 text-xs text-muted-foreground">{t("endpoint.header.systemGenerated")}</span> },
            ]}
            rowClass="opacity-70"
            compact
          />
        </section>
      </Show>
      <KeyValueTable
        rows={props.value}
        makeRow={makeRow}
        onChange={props.onChange}
        nameLabel={t("common.name")}
        valueLabel={t("common.value")}
        nameSuggestions={commonHeaderNames}
      />
    </div>
  )
}
