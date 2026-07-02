// 请求参数编辑器（受控组件）：支持 query / path / cookie 参数位置、必填、示例
import { Plus, Trash2 } from "lucide-solid"

import type { ParamRow } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import type { ParamLocation } from "@/lib/types"

export interface ParamsEditorProps {
  value: ParamRow[]
  onChange: (rows: ParamRow[]) => void
}

const locationOptions = [
  { value: "query", label: "Query" },
  { value: "path", label: "Path" },
  { value: "cookie", label: "Cookie" },
]

export function ParamsEditor(props: ParamsEditorProps) {
  const addParam = () => {
    props.onChange([...props.value, {
      id: crypto.randomUUID(),
      type: "query",
      name: "",
      value: "",
      description: "",
      enabled: true,
      dataType: "string",
      required: false,
      example: "",
    }])
  }

  const removeParam = (id: string) => {
    props.onChange(props.value.filter(p => p.id !== id))
  }

  const updateParam = (id: string, field: keyof ParamRow, value: string | boolean) => {
    props.onChange(props.value.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  return (
    <div class="h-full overflow-auto">
      <Table
        columns={[
          {
            header: "", width: "32px", render: (row) => (
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => updateParam(row.id, "enabled", e.currentTarget.checked)}
                class="rounded border-border"
              />
            ),
          },
          {
            header: t("endpoint.param.location"), width: "96px", render: (row) => (
              <Select
                options={locationOptions}
                value={row.type}
                onChange={(v) => updateParam(row.id, "type", v as ParamLocation)}
                size="sm"
              />
            ),
          },
          {
            header: t("endpoint.param.name"), render: (row) => (
              <Input size="sm" value={row.name} onInput={(e) => updateParam(row.id, "name", e.currentTarget.value)} />
            ),
          },
          {
            header: t("endpoint.param.value"), render: (row) => (
              <Input size="sm" value={row.value} onInput={(e) => updateParam(row.id, "value", e.currentTarget.value)} />
            ),
          },
          {
            header: t("endpoint.param.required"), width: "56px", render: (row) => (
              <input
                type="checkbox"
                checked={row.required}
                onChange={(e) => updateParam(row.id, "required", e.currentTarget.checked)}
                class="rounded border-border"
              />
            ),
          },
          {
            header: t("endpoint.param.example"), render: (row) => (
              <Input size="sm" value={row.example} onInput={(e) => updateParam(row.id, "example", e.currentTarget.value)} />
            ),
          },
          {
            header: t("endpoint.param.description"), render: (row) => (
              <Input size="sm" value={row.description} onInput={(e) => updateParam(row.id, "description", e.currentTarget.value)} />
            ),
          },
          {
            header: "", width: "32px", render: (row) => (
              <Button variant="ghost" size="icon-sm" onClick={() => removeParam(row.id)}>
                <Trash2 class="h-3 w-3" />
              </Button>
            ),
          },
        ]}
        data={props.value}
        compact
        emptyText={t("endpoint.param.add")}
      />
      <Button variant="outline" size="sm" class="mt-2" onClick={addParam}>
        <Plus class="h-3 w-3" />
        {t("endpoint.param.add")}
      </Button>
    </div>
  )
}
