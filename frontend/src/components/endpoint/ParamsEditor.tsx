// 请求参数编辑器（受控组件）
// 参数 tab 按 Path / Query / 全局 Query 三块区域自上而下排列（无"位置"选择）；
// Path 在最上：它由接口路径里的 {id} 占位符自动识别，是"这条路径本身要求填的东西"，
// 数量固定且不可增删，比可有可无的 Query 更该先看到。无占位符时整块隐藏。
// 全局 Query 参数继承自模块，值只读（在设置页修改），开关仅对本接口生效。
// Cookie 参数由独立的 CookiesEditor 编辑。三者共享同一份 ParamRow[]（按 type 区分），
// 各编辑器改动时都会回传「完整」列表以保持彼此数据不丢失。
// 录入交互（草稿行 / 悬停删除 / 批量编辑）统一由 KeyValueTable 提供。
import { Icon } from "@iconify-icon/solid"
import { Show } from "solid-js"

import type { ParamRow } from "@/components/endpoint/EndpointDetail"
import { KeyValueTable } from "@/components/endpoint/KeyValueTable"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table } from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { t } from "@/hooks/useI18n"
import type { ParamLocation } from "@/lib/types"
import { cn, extractPathParams } from "@/lib/utils"

export interface ParamsEditorProps {
  value: ParamRow[]
  onChange: (rows: ParamRow[]) => void
  /** 接口路径，用于自动识别 path 参数（{name} 占位符） */
  path?: string
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
 * ParamsEditor 参数编辑器（Path / Query / 全局 Query 三分区）
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

  // Path 参数：从接口路径中自动识别（形如 {id}）
  const pathTokens = () => extractPathParams(props.path ?? "")
  // 依据路径 token 派生 path 参数行：命中已存的行则沿用其值，否则新建（id 由名称派生以保持稳定）
  const pathRows = (): ParamRow[] => {
    const existing = rowsOf("path")
    return pathTokens().map(name => {
      const found = existing.find(r => r.name === name)
      return found ?? { ...makeRow("path"), id: `__path_${name}`, name }
    })
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
      {/* Path 参数：仅当接口路径含 {name} 占位符时显示，名称只读、不能增删 */}
      <Show when={pathTokens().length > 0}>
        <KeyValueTable
          title={t("endpoint.param.pathParams")}
          rows={pathRows()}
          makeRow={() => makeRow("path")}
          onChange={rows => emit("path", rows)}
          nameReadOnly
          fixedRows
          showRequired
          showExample
        />
      </Show>

      {/* Query 参数 */}
      <KeyValueTable
        title={t("endpoint.param.queryParams")}
        rows={rowsOf("query")}
        makeRow={() => makeRow("query")}
        onChange={rows => emit("query", rows)}
        showRequired
        showExample
      />

      {/* 全局 Query 参数（继承自模块，值只读、开关仅对本接口生效）：无全局参数时整块隐藏 */}
      <Show when={(props.globalQueryParams?.length ?? 0) > 0}>
        <section>
          <h3 class="text-sm font-medium text-foreground mb-2">
            <span class="inline-flex items-center gap-1.5">
              <Icon icon="lucide:globe" class="h-3.5 w-3.5 text-muted-foreground" />
              {t("endpoint.param.globalQueryParams")}
            </span>
          </h3>
          <p class="text-xs text-muted-foreground mb-2">{t("endpoint.param.globalQueryParamsHint")}</p>
          <Table
            columns={[
              {
                header: "", width: "32px", render: (gp) => (
                  <Checkbox
                    checked={isGlobalEnabled(gp.name)}
                    onChange={(e) => toggleGlobal(gp.name, e.currentTarget.checked)}
                  />
                ),
              },
              {
                header: t("endpoint.param.name"), render: (gp) => (
                  <Input
                    size="sm"
                    value={gp.name}
                    readOnly
                    class={cn("font-mono border-transparent bg-transparent", !isGlobalEnabled(gp.name) && "opacity-50")}
                  />
                ),
              },
              {
                header: t("endpoint.param.value"), render: (gp) => (
                  // 值只读：hover 提示前往设置页面修改
                  <Tooltip content={t("endpoint.param.globalValueReadonlyHint")} placement="top" class="block w-full">
                    <Input
                      size="sm"
                      value={gp.value}
                      readOnly
                      class={cn("font-mono w-full cursor-help border-transparent bg-transparent", !isGlobalEnabled(gp.name) && "opacity-50")}
                    />
                  </Tooltip>
                ),
              },
            ]}
            data={props.globalQueryParams ?? []}
            compact
          />
        </section>
      </Show>
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
      <KeyValueTable
        rows={cookieRows()}
        makeRow={() => makeRow("cookie")}
        onChange={emit}
        showRequired
        showExample
      />
    </div>
  )
}
