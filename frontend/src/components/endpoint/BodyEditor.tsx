// 请求体编辑器（受控组件）
import { Plus, Trash2, Upload } from "lucide-solid"
import { For, Show } from "solid-js"

import type { BodyFieldRow } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { type BodyType } from "@/lib/types"
import { cn } from "@/lib/utils"

/** 请求体类型选项 */
const bodyTypeOptions = [
  { value: "none", label: "none" },
  { value: "form-data", label: "form-data" },
  { value: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
]

/** BodyEditor 变更补丁：只携带本次变化的字段 */
export interface BodyEditorPatch {
  bodyType?: BodyType
  bodyContent?: string
  contentType?: string
  bodyFields?: BodyFieldRow[]
}

export interface BodyEditorProps {
  bodyType: BodyType
  bodyContent: string
  contentType: string
  fields: BodyFieldRow[]
  onChange: (patch: BodyEditorPatch) => void
}

export function BodyEditor(props: BodyEditorProps) {
  const addField = () => {
    props.onChange({ bodyFields: [...props.fields, {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      fieldType: "text",
      enabled: true,
    }] })
  }

  const removeField = (id: string) => {
    props.onChange({ bodyFields: props.fields.filter(f => f.id !== id) })
  }

  const updateField = (id: string, patch: Partial<BodyFieldRow>) => {
    props.onChange({ bodyFields: props.fields.map(f => f.id === id ? { ...f, ...patch } : f) })
  }

  // 读取所选文件为 base64（去掉 data: 前缀），存入该行
  const pickFile = (id: string, input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || "")
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result
      updateField(id, { fileName: file.name, fileContent: base64 })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div class="p-3 h-full overflow-auto flex flex-col">
      {/* 请求体类型选择 */}
      <div class="flex items-center gap-2 mb-3">
        <div class="flex gap-1">
          <For each={bodyTypeOptions}>
            {(opt) => (
              <button
                class={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors",
                  props.bodyType === opt.value
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                onClick={() => props.onChange({ bodyType: opt.value as BodyType })}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>

        {/* JSON/Text 的内容类型选择 */}
        <Show when={props.bodyType === "json" || props.bodyType === "text"}>
          <div class="ml-auto">
            <Input
              size="sm"
              value={props.contentType}
              onInput={(e) => props.onChange({ contentType: e.currentTarget.value })}
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
            value={props.bodyContent}
            onInput={(e) => props.onChange({ bodyContent: e.currentTarget.value })}
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
                    onChange={(e) => updateField(row.id, { enabled: e.currentTarget.checked })}
                    class="rounded border-border"
                  />
                ),
              },
              {
                header: t("endpoint.param.name"), render: (row) => (
                  <Input size="sm" value={row.name} onInput={(e) => updateField(row.id, { name: e.currentTarget.value })} />
                ),
              },
              {
                header: t("endpoint.param.value"), render: (row) => (
                  <Show
                    when={props.bodyType === "form-data" && row.fieldType === "file"}
                    fallback={
                      <Input size="sm" value={row.value} onInput={(e) => updateField(row.id, { value: e.currentTarget.value })} />
                    }
                  >
                    {/* 文件选择：显示文件名 + 选择按钮 */}
                    <label class="flex items-center gap-2 cursor-pointer text-sm">
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted hover:text-foreground text-muted-foreground">
                        <Upload class="h-3 w-3" />
                        {t("common.chooseFile")}
                      </span>
                      <span class="truncate text-muted-foreground max-w-40">{row.fileName || t("common.noFileChosen")}</span>
                      <input type="file" class="hidden" onChange={(e) => pickFile(row.id, e.currentTarget)} />
                    </label>
                  </Show>
                ),
              },
              ...(props.bodyType === "form-data" ? [{
                header: t("common.type"), width: "96px", render: (row: BodyFieldRow) => (
                  <Select
                    options={[{ value: "text", label: t("common.text") }, { value: "file", label: t("common.file") }]}
                    value={row.fieldType}
                    onChange={(v) => updateField(row.id, { fieldType: v as "text" | "file", value: "", fileName: "", fileContent: "" })}
                    size="sm"
                  />
                ),
              }] : []),
              {
                header: "", width: "32px", render: (row: BodyFieldRow) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => removeField(row.id)}>
                    <Trash2 class="h-3 w-3" />
                  </Button>
                ),
              },
            ]}
            data={props.fields}
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
