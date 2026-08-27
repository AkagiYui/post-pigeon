// 请求头编辑器（受控组件）
// 与参数编辑器共用 KeyValueTable：末行草稿行直接录入、hover 显删除、支持批量编辑。
import type { HeaderRow } from "@/components/endpoint/EndpointDetail"
import { KeyValueTable } from "@/components/endpoint/KeyValueTable"
import { t } from "@/hooks/useI18n"

export interface HeadersEditorProps {
  value: HeaderRow[]
  onChange: (rows: HeaderRow[]) => void
}

/** 构造一行空请求头 */
function makeRow(): HeaderRow {
  return {
    id: crypto.randomUUID(), name: "", value: "", description: "",
    enabled: true, required: false, example: "",
  }
}

export function HeadersEditor(props: HeadersEditorProps) {
  return (
    <div class="h-full overflow-auto p-3">
      <KeyValueTable
        rows={props.value}
        makeRow={makeRow}
        onChange={props.onChange}
        nameLabel={t("common.name")}
        valueLabel={t("common.value")}
      />
    </div>
  )
}
