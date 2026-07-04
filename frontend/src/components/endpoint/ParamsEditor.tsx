// 请求参数编辑器（受控组件）
// 参数 tab 按 Query / Path / 全局 Query 三块区域自上而下排列（无"位置"选择）；
// Cookie 参数由独立的 CookiesEditor 编辑。三者共享同一份 ParamRow[]（按 type 区分），
// 各编辑器改动时都会回传「完整」列表以保持彼此数据不丢失。
import { Globe, Plus, Trash2 } from "lucide-solid"
import { For, Show } from "solid-js"

import type { ParamRow } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import type { ParamLocation } from "@/lib/types"

export interface ParamsEditorProps {
  value: ParamRow[]
  onChange: (rows: ParamRow[]) => void
  /** 模块级"全局" query 参数（只读展示），来自模块自动参数 */
  globalQueryParams?: { name: string; value: string }[]
  /** 本接口禁用的全局参数名列表（仅影响本接口） */
  disabledGlobalParams?: string[]
  /** 本接口禁用全局参数集合变化回调 */
  onDisabledGlobalParamsChange?: (names: string[]) => void
}

/** 构造某一位置的空参数行 */
function makeRow(type: ParamLocation): ParamRow {
  return {
    id: crypto.randomUUID(), type, name: "", value: "", description: "",
    enabled: true, dataType: "string", required: false, example: "",
  }
}

/**
 * ParamsEditor 参数编辑器（Query / Path / 全局 Query 三分区）
 */
export function ParamsEditor(props: ParamsEditorProps) {
  const rowsOf = (type: ParamLocation) => props.value.filter(p => p.type === type)

  // 某一位置的行变更后，与其它位置的行合并回完整列表（保留 cookie 行）
  const emit = (type: ParamLocation, next: ParamRow[]) => {
    const q = type === "query" ? next : rowsOf("query")
    const p = type === "path" ? next : rowsOf("path")
    const c = rowsOf("cookie")
    props.onChange([...q, ...p, ...c])
  }

  const disabledSet = () => new Set(props.disabledGlobalParams ?? [])
  const isGlobalEnabled = (name: string) => !disabledSet().has(name)
  const toggleGlobal = (name: string, on: boolean) => {
    const set = disabledSet()
    if (on) set.delete(name)
    else set.add(name)
    props.onDisabledGlobalParamsChange?.([...set])
  }

  return (
    <div class="h-full overflow-auto p-3 space-y-5">
      {/* Query 参数 */}
      <section>
        <SectionTitle>{t("endpoint.param.queryParams")}</SectionTitle>
        <ParamTable
          rows={rowsOf("query")}
          type="query"
          onChange={(rows) => emit("query", rows)}
        />
      </section>

      {/* Path 参数 */}
      <section>
        <SectionTitle>{t("endpoint.param.pathParams")}</SectionTitle>
        <ParamTable
          rows={rowsOf("path")}
          type="path"
          onChange={(rows) => emit("path", rows)}
        />
      </section>

      {/* 全局 Query 参数（继承自模块，开关仅对本接口生效） */}
      <section>
        <SectionTitle>
          <span class="inline-flex items-center gap-1.5">
            <Globe class="h-3.5 w-3.5 text-muted-foreground" />
            {t("endpoint.param.globalQueryParams")}
          </span>
        </SectionTitle>
        <p class="text-xs text-muted-foreground mb-2">{t("endpoint.param.globalQueryParamsHint")}</p>
        <Show
          when={(props.globalQueryParams?.length ?? 0) > 0}
          fallback={<p class="text-sm text-muted-foreground py-2">{t("endpoint.param.noGlobalParams")}</p>}
        >
          <div class="border border-border rounded-md divide-y divide-border overflow-hidden">
            <For each={props.globalQueryParams}>
              {(gp) => (
                <label class={cn(
                  "flex items-center gap-3 px-3 py-1.5 text-sm cursor-pointer select-none transition-colors hover:bg-muted/30",
                  !isGlobalEnabled(gp.name) && "opacity-50",
                )}>
                  <input
                    type="checkbox"
                    checked={isGlobalEnabled(gp.name)}
                    onChange={(e) => toggleGlobal(gp.name, e.currentTarget.checked)}
                    class="rounded border-border shrink-0"
                  />
                  <span class="font-mono text-xs w-40 shrink-0 truncate" title={gp.name}>{gp.name}</span>
                  <span class="font-mono text-xs text-muted-foreground flex-1 min-w-0 truncate" title={gp.value}>{gp.value}</span>
                </label>
              )}
            </For>
          </div>
        </Show>
      </section>
    </div>
  )
}

/**
 * CookiesEditor Cookie 参数编辑器（独立 tab）
 * 与 ParamsEditor 共享同一 ParamRow[]，仅编辑 type=cookie 的行。
 */
export function CookiesEditor(props: { value: ParamRow[]; onChange: (rows: ParamRow[]) => void }) {
  const cookieRows = () => props.value.filter(p => p.type === "cookie")
  const emit = (next: ParamRow[]) => {
    const others = props.value.filter(p => p.type !== "cookie")
    props.onChange([...others, ...next])
  }

  return (
    <div class="h-full overflow-auto p-3">
      <ParamTable rows={cookieRows()} type="cookie" onChange={emit} />
    </div>
  )
}

/** 分区标题 */
function SectionTitle(props: { children: any }) {
  return <h3 class="text-sm font-medium text-foreground mb-2">{props.children}</h3>
}

/**
 * ParamTable 单一位置的参数表（无"位置"列）。
 * onChange 回传的是本 type 的完整行列表，由上层与其它位置合并。
 */
function ParamTable(props: {
  rows: ParamRow[]
  type: ParamLocation
  onChange: (rows: ParamRow[]) => void
}) {
  const addParam = () => props.onChange([...props.rows, makeRow(props.type)])
  const removeParam = (id: string) => props.onChange(props.rows.filter(p => p.id !== id))
  const updateParam = (id: string, field: keyof ParamRow, value: string | boolean) =>
    props.onChange(props.rows.map(p => p.id === id ? { ...p, [field]: value } : p))

  return (
    <>
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
        data={props.rows}
        compact
        emptyText={t("endpoint.param.empty")}
      />
      <Button variant="outline" size="sm" class="mt-2" onClick={addParam}>
        <Plus class="h-3 w-3" />
        {t("endpoint.param.add")}
      </Button>
    </>
  )
}
