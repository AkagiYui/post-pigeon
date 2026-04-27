// 请求参数编辑器
import { Plus, Trash2 } from "lucide-solid"
import { createSignal, For } from "solid-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"

interface ParamRow {
  id: string
  name: string
  value: string
  description: string
  enabled: boolean
}

export function ParamsEditor() {
  const [params, setParams] = createSignal<ParamRow[]>([])

  const addParam = () => {
    setParams(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      description: "",
      enabled: true,
    }])
  }

  const removeParam = (id: string) => {
    setParams(prev => prev.filter(p => p.id !== id))
  }

  const updateParam = (id: string, field: keyof ParamRow, value: string | boolean) => {
    setParams(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
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
        data={params()}
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
