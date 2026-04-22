// 请求头编辑器
import { Plus, Trash2 } from "lucide-solid"
import { createSignal, For } from "solid-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"

interface HeaderRow {
  id: string
  name: string
  value: string
  description: string
  enabled: boolean
}

export function HeadersEditor() {
  const [headers, setHeaders] = createSignal<HeaderRow[]>([])

  const addHeader = () => {
    setHeaders(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      description: "",
      enabled: true,
    }])
  }

  const removeHeader = (id: string) => {
    setHeaders(prev => prev.filter(h => h.id !== id))
  }

  const updateHeader = (id: string, field: keyof HeaderRow, value: string | boolean) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  return (
    <div class="p-3 h-full overflow-auto">
      <Table
        columns={[
          {
            header: "", width: "32px", render: (row) => (
              <input
                type="checkbox"
                checked={row.enabled}
                class="rounded border-border"
              />
            ),
          },
          {
            header: "Name", render: (row) => (
              <Input size="sm" value={row.name} onInput={(e) => updateHeader(row.id, "name", e.currentTarget.value)} />
            ),
          },
          {
            header: "Value", render: (row) => (
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
                <Trash2 class="h-3 w-3" />
              </Button>
            ),
          },
        ]}
        data={headers() as any[]}
        compact
      />
      <Button variant="outline" size="sm" class="mt-2" onClick={addHeader}>
        <Plus class="h-3 w-3" />
        {t("common.add")}
      </Button>
    </div>
  )
}
