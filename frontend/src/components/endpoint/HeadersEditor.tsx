// 请求头编辑器（受控组件）
import { Icon } from "@iconify-icon/solid"

import type { HeaderRow } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"

export interface HeadersEditorProps {
  value: HeaderRow[]
  onChange: (rows: HeaderRow[]) => void
}

export function HeadersEditor(props: HeadersEditorProps) {
  const addHeader = () => {
    props.onChange([...props.value, {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      description: "",
      enabled: true,
      required: false,
      example: "",
    }])
  }

  const removeHeader = (id: string) => {
    props.onChange(props.value.filter(h => h.id !== id))
  }

  const updateHeader = (id: string, field: keyof HeaderRow, value: string | boolean) => {
    props.onChange(props.value.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  return (
    <div class="h-full overflow-auto">
      <Table
        columns={[
          {
            header: "", width: "32px", render: (row) => (
              <Checkbox
                checked={row.enabled}
                onChange={(e) => updateHeader(row.id, "enabled", e.currentTarget.checked)}
              />
            ),
          },
          {
            header: t("common.name"), render: (row) => (
              <Input size="sm" value={row.name} onInput={(e) => updateHeader(row.id, "name", e.currentTarget.value)} />
            ),
          },
          {
            header: t("common.value"), render: (row) => (
              <Input size="sm" value={row.value} onInput={(e) => updateHeader(row.id, "value", e.currentTarget.value)} />
            ),
          },
          {
            header: t("endpoint.param.description"), render: (row) => (
              <Input size="sm" value={row.description} onInput={(e) => updateHeader(row.id, "description", e.currentTarget.value)} />
            ),
          },
          {
            header: "", width: "32px", render: (row) => (
              <Button variant="ghost" size="icon-sm" onClick={() => removeHeader(row.id)}>
                <Icon icon="lucide:trash-2" class="h-3 w-3" />
              </Button>
            ),
          },
        ]}
        data={props.value}
        compact
      />
      <Button variant="outline" size="sm" class="mt-2" onClick={addHeader}>
        <Icon icon="lucide:plus" class="h-3 w-3" />
        {t("common.add")}
      </Button>
    </div>
  )
}
