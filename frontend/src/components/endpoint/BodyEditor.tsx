// 请求体编辑器（受控组件）
import { Icon } from "@iconify-icon/solid"
import { createMemo, For, Show } from "solid-js"

import { FileService } from "@/../bindings/PostPigeon/internal/services"
import type { BodyFieldRow } from "@/components/endpoint/EndpointDetail"
import { normalizeBodyFieldsForType } from "@/components/endpoint/endpoint-data"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CodeEditor, type CodeLanguage } from "@/components/ui/code-editor"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import { convertJSON5ToJSON, formatBody, formatJSONC } from "@/lib/format"
import { type BodyType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toastError } from "@/stores/toast"

/** 请求体类型 → 编辑器语法。JSON 用 jsonc：注释是被支持的写法，得高亮成注释而不是错误 */
const editorLanguage: Record<string, CodeLanguage> = {
  json: "jsonc",
  xml: "xml",
  text: "text",
}

/** 请求体类型选项 */
const bodyTypeOptions = [
  { value: "none", labelKey: "endpoint.body.none" },
  { value: "form-data", labelKey: "endpoint.body.formData" },
  { value: "x-www-form-urlencoded", labelKey: "endpoint.body.urlencoded" },
  { value: "json", labelKey: "endpoint.body.json" },
  { value: "xml", labelKey: "endpoint.body.xml" },
  { value: "text", labelKey: "endpoint.body.text" },
  { value: "binary", labelKey: "endpoint.body.binary" },
  { value: "graphql", labelKey: "endpoint.body.graphql" },
]

/** GraphQL 请求体在 bodyContent 中的存储形态（与后端 models.GraphQLBody 一致） */
interface GraphQLBody {
  query: string
  variables: string
  operationName?: string
}

/** 解析存储形态；非法或空时返回空查询 */
function parseGraphQLBody(raw: string): GraphQLBody {
  try {
    const parsed = JSON.parse(raw || "{}") as Partial<GraphQLBody>
    return {
      query: parsed.query || "",
      variables: parsed.variables || "",
      operationName: parsed.operationName || "",
    }
  } catch {
    return { query: "", variables: "", operationName: "" }
  }
}

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
  const changeBodyType = (bodyType: BodyType) => {
    const bodyFields = normalizeBodyFieldsForType(props.fields, bodyType)
    props.onChange(bodyFields === props.fields ? { bodyType } : { bodyType, bodyFields })
  }

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

  // 选文件走原生对话框：库里存的是路径，而浏览器的 <input type="file"> 只给内容不给路径
  const pickFile = async (id: string) => {
    try {
      const picked = await FileService.PickFile()
      if (!picked?.path) return // 用户取消
      updateField(id, { fileName: picked.name, filePath: picked.path, fileContent: "" })
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  // GraphQL 请求体：查询与变量分开编辑，合并存进 bodyContent
  const graphql = createMemo(() => parseGraphQLBody(props.bodyContent))
  const patchGraphQL = (patch: Partial<GraphQLBody>) => {
    props.onChange({ bodyContent: JSON.stringify({ ...graphql(), ...patch }) })
  }

  // Binary 请求体当前引用的文件（从 bodyContent 的 JSON 解析）
  const binaryFile = createMemo<{ fileName?: string, path?: string }>(() => {
    try { return JSON.parse(props.bodyContent || "{}") } catch { return {} }
  })
  const binaryFileName = () => binaryFile().fileName || ""
  const binaryFilePath = () => binaryFile().path || ""

  // 选择 Binary 请求体文件：打包为 {fileName, path} 存入 bodyContent
  const pickBinaryFile = async () => {
    try {
      const picked = await FileService.PickFile()
      if (!picked?.path) return // 用户取消
      props.onChange({ bodyContent: JSON.stringify({ fileName: picked.name, path: picked.path }) })
    } catch (e) {
      toastError(e, "error.op.loadFailed")
    }
  }

  // 格式化：JSON 用 jsonc-parser（只改空白，注释与大整数原样保留），XML 用标签缩进
  const canFormat = () => (props.bodyType === "json" || props.bodyType === "xml") && props.bodyContent.trim() !== ""
  const formatContent = () => {
    const formatted = props.bodyType === "json"
      ? formatJSONC(props.bodyContent)
      : formatBody(props.bodyContent, "xml")
    if (formatted !== props.bodyContent) props.onChange({ bodyContent: formatted })
  }

  // JSON5 → 标准 JSON：从浏览器控制台、JS 代码里复制来的对象字面量（单引号、无引号键名、
  // 十六进制数字）一键转成能发出去的 JSON。这一步会重新序列化，注释与大整数精度都留不住，
  // 所以做成显式命令而不是发送时自动转换；转错了可以直接在编辑器里撤销。
  const fromJSON5 = () => {
    try {
      const converted = convertJSON5ToJSON(props.bodyContent)
      if (converted !== props.bodyContent) props.onChange({ bodyContent: converted })
    } catch (e) {
      toastError(e, "endpoint.body.fromJSON5.failed")
    }
  }

  return (
    <div class="p-3 h-full overflow-auto flex flex-col">
      {/* 请求体类型选择 */}
      <div class="flex items-center gap-2 mb-3">
        <div class="flex flex-wrap gap-1">
          <For each={bodyTypeOptions}>
            {(opt) => (
              <button
                class={cn(
                  "shrink-0 whitespace-nowrap px-2.5 py-1 text-xs rounded-md transition-colors",
                  props.bodyType === opt.value
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                onClick={() => changeBodyType(opt.value as BodyType)}
              >
                {t(opt.labelKey)}
              </button>
            )}
          </For>
        </div>

        {/* 格式化：JSON 走 jsonc-parser（保留注释），XML 走标签缩进 */}
        <Show when={canFormat()}>
          <div class="ml-auto flex shrink-0 items-center gap-1">
            <Show when={props.bodyType === "json"}>
              <Tooltip content={t("endpoint.body.fromJSON5.hint")} placement="top">
                <Button variant="ghost" size="sm" class="whitespace-nowrap text-muted-foreground" onClick={fromJSON5}>
                  <Icon icon="lucide:braces" class="h-3 w-3" />
                  {t("endpoint.body.fromJSON5")}
                </Button>
              </Tooltip>
            </Show>
            <Button variant="ghost" size="sm" class="whitespace-nowrap text-muted-foreground" onClick={formatContent}>
              <Icon icon="lucide:wand-sparkles" class="h-3 w-3" />
              {t("endpoint.body.format")}
            </Button>
          </div>
        </Show>

        {/* JSON/Text/XML 的内容类型选择 */}
        <Show when={props.bodyType === "json" || props.bodyType === "text" || props.bodyType === "xml" || props.bodyType === "graphql"}>
          <div class={cn(!canFormat() && "ml-auto")}>
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
      <div class="flex-1 min-h-0">
        <Show when={props.bodyType === "none"}>
          <div class="text-sm text-muted-foreground text-center py-8">
            {t("endpoint.body.none")}
          </div>
        </Show>

        {/* GraphQL：查询与变量分栏，实际发送时组装成标准的 JSON 请求体 */}
        <Show when={props.bodyType === "graphql"}>
          <div class="flex h-full flex-col gap-3">
            <div class="flex min-h-0 flex-1 flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{t("endpoint.body.graphql.query")}</label>
              <Textarea
                value={graphql().query}
                onInput={(e) => patchGraphQL({ query: e.currentTarget.value })}
                placeholder={"query {\n  user(id: 1) {\n    name\n  }\n}"}
                spellcheck={false}
                class="min-h-0 flex-1 resize-none font-mono text-xs"
              />
            </div>
            <div class="flex h-32 shrink-0 flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">{t("endpoint.body.graphql.variables")}</label>
              <Textarea
                value={graphql().variables}
                onInput={(e) => patchGraphQL({ variables: e.currentTarget.value })}
                placeholder={"{\n  \"id\": 1\n}"}
                spellcheck={false}
                class="min-h-0 flex-1 resize-none font-mono text-xs"
              />
            </div>
            <p class="shrink-0 text-xs text-muted-foreground">{t("endpoint.body.graphql.hint")}</p>
          </div>
        </Show>

        <Show when={props.bodyType === "json" || props.bodyType === "text" || props.bodyType === "xml"}>
          <CodeEditor
            value={props.bodyContent}
            onChange={(v) => props.onChange({ bodyContent: v })}
            language={editorLanguage[props.bodyType] ?? "text"}
            placeholder={props.bodyType === "json" ? t("endpoint.placeholder.jsonBody") : t("endpoint.placeholder.requestBody")}
          />
        </Show>

        {/* Binary：选择单个文件，打包为 {fileName, content(base64)} 存入 bodyContent */}
        <Show when={props.bodyType === "binary"}>
          <div class="flex flex-col gap-2 py-4">
            <button
              type="button"
              class="flex items-center gap-2 self-start text-sm"
              title={binaryFilePath() || undefined}
              onClick={() => void pickBinaryFile()}
            >
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted hover:text-foreground text-muted-foreground">
                <Icon icon="lucide:upload" class="h-3 w-3" />
                {t("common.chooseFile")}
              </span>
              <span class="truncate text-muted-foreground max-w-60">{binaryFileName() || t("common.noFileChosen")}</span>
            </button>
            <Input
              size="sm"
              value={props.contentType}
              onInput={(e) => props.onChange({ contentType: e.currentTarget.value })}
              placeholder="application/octet-stream"
              class="w-64"
            />
          </div>
        </Show>

        <Show when={props.bodyType === "form-data" || props.bodyType === "x-www-form-urlencoded"}>
          <Table
            columns={[
              {
                header: "", width: "32px", render: (row) => (
                  <Checkbox
                    checked={row.enabled}
                    onChange={(e) => updateField(row.id, { enabled: e.currentTarget.checked })}
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
                    {/* 文件选择：显示文件名 + 选择按钮，鼠标悬停能看到完整路径 */}
                    <button
                      type="button"
                      class="flex items-center gap-2 text-sm"
                      title={row.filePath || undefined}
                      onClick={() => void pickFile(row.id)}
                    >
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted hover:text-foreground text-muted-foreground">
                        <Icon icon="lucide:upload" class="h-3 w-3" />
                        {t("common.chooseFile")}
                      </span>
                      <span class="truncate text-muted-foreground max-w-40">{row.fileName || t("common.noFileChosen")}</span>
                    </button>
                  </Show>
                ),
              },
              ...(props.bodyType === "form-data" ? [{
                header: t("common.type"), width: "96px", render: (row: BodyFieldRow) => (
                  <Select
                    options={[{ value: "text", label: t("common.text") }, { value: "file", label: t("common.file") }]}
                    value={row.fieldType}
                    onChange={(v) => updateField(row.id, { fieldType: v as "text" | "file", value: "", fileName: "", filePath: "", fileContent: "" })}
                    size="sm"
                  />
                ),
              }] : []),
              {
                header: "", width: "32px", render: (row: BodyFieldRow) => (
                  <Button variant="ghost" size="icon-sm" onClick={() => removeField(row.id)}>
                    <Icon icon="lucide:trash-2" class="h-3 w-3" />
                  </Button>
                ),
              },
            ]}
            data={props.fields}
            compact
          />
          <Button variant="outline" size="sm" class="mt-2" onClick={addField}>
            <Icon icon="lucide:plus" class="h-3 w-3" />
            {t("common.add")}
          </Button>
        </Show>
      </div>
    </div>
  )
}
