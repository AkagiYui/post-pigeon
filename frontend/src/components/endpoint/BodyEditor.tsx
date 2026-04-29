// 请求体编辑器
import { Plus, Trash2 } from "lucide-solid"
import { createSignal, For, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { type BodyType, CONTENT_TYPES } from "@/lib/types"
import { cn } from "@/lib/utils"

/** 请求体类型选项 */
const bodyTypeOptions = [
  { value: "none", label: "none" },
  { value: "form-data", label: "form-data" },
  { value: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
]

/** 内容类型选项 */
const contentTypeOptions = CONTENT_TYPES.map(ct => ({ value: ct, label: ct }))

export interface BodyEditorProps {
  bodyType: BodyType
  onChange?: (bodyType: BodyType) => void
}

interface FieldRow {
  id: string
  name: string
  value: string
  fieldType: "text" | "file"
  enabled: boolean
}

export function BodyEditor(props: BodyEditorProps) {
  const [bodyContent, setBodyContent] = createSignal("")
  const [contentType, setContentType] = createSignal("application/json")
  const [fields, setFields] = createSignal<FieldRow[]>([])

  const addField = () => {
    setFields(prev => [...prev, {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      fieldType: "text",
      enabled: true,
    }])
  }

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const updateField = (id: string, field: keyof FieldRow, value: string | boolean) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  return (
    <div class="p-3 h-full overflow-auto flex flex-col">
      {/* 请求体类型选择 */}
      <div class="flex items-center gap-2 mb-3">
        <div class="flex gap-1">
          {bodyTypeOptions.map(opt => (
            <button
              class={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors",
                props.bodyType === opt.value
                  ? "bg-accent text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => props.onChange?.(opt.value as BodyType)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* JSON/Text 的内容类型选择 */}
        <Show when={props.bodyType === "json" || props.bodyType === "text"}>
          <div class="ml-auto">
            <Input
              size="sm"
              value={contentType()}
              onInput={(e) => setContentType(e.currentTarget.value)}
              placeholder="application/json"
              class="w-48"
            />
          </div>
        </Show>
      </div>

      {/* 编辑区域 */}
      <div class="flex-1">
        <Show when={props.bodyType === "none"}>
          <div class="text-sm text-muted-foreground text-center py-8">
            {t("endpoint.body.none")}
          </div>
        </Show>

        <Show when={props.bodyType === "json" || props.bodyType === "text"}>
          <Textarea
            value={bodyContent()}
            onInput={(e) => setBodyContent(e.currentTarget.value)}
            placeholder={props.bodyType === "json" ? t("endpoint.placeholder.jsonBody") : t("endpoint.placeholder.requestBody")}
            class="h-full font-mono text-sm"
          />
        </Show>

        <Show when={props.bodyType === "form-data" || props.bodyType === "x-www-form-urlencoded"}>
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
                header: t("endpoint.param.name"), render: (row) => (
                  <Input size="sm" value={row.name} onInput={(e) => updateField(row.id, "name", e.currentTarget.value)} />
                ),
              },
              {
                header: t("endpoint.param.value"), render: (row) => (
                  <Input size="sm" value={row.value} onInput={(e) => updateField(row.id, "value", e.currentTarget.value)} />
                ),
              },
              ...(props.bodyType === "form-data" ? [{
                header: t("common.type"), render: (row: FieldRow) => (
                  <Select
                    options={[{ value: "text", label: t("common.text") }, { value: "file", label: t("common.file") }]}
                    value={row.fieldType}
                    onChange={(v) => updateField(row.id, "fieldType", v)}
                    size="sm"
                  />
                ),
              }] : []),
              {
                header: "", width: "32px", render: (row) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => removeField(row.id)}>
                    <Trash2 class="h-3 w-3" />
                  </Button>
                ),
              },
            ]}
            data={fields() as any[]}
            compact
          />
          <Button variant="outline" size="sm" class="mt-2" onClick={addField}>
            <Plus class="h-3 w-3" />
            {t("common.add")}
          </Button>
        </Show>
      </div>
    </div>
  )
}
