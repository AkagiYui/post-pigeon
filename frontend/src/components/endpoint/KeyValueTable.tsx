// 键值参数表：Query / Cookie / Path 参数与请求头共用的编辑表格。
//
// 录入交互抄自 Apifox：
// - 表尾常驻一行「草稿行」，直接往里打字即转成正式行，并在其下再生成一行草稿行，
//   不再需要先点「添加参数」再回来填（一次录入省一次点击与一次视线往返）。
// - 草稿行转正时沿用草稿行自己的 id，行 DOM 不会重建，正在输入的输入框不丢焦点。
// - 删除按钮平时隐藏，行 hover 或键盘聚焦时才显形，行尾不再挂一排红叉。
// - Enter 跳到下一行同列（末行则落到草稿行），可以一路键盘录完一张表。
// - 「批量编辑」把整张表摊成 `name: value` 文本，整段 query string 可以直接粘贴。
import { Icon } from "@iconify-icon/solid"
import { batch, createSignal, For, type JSX, Show } from "solid-js"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Textarea } from "@/components/ui/input"
import { Table, type TableColumn } from "@/components/ui/table"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

import { mergeBulkEntries, parseBulkText, serializeBulkText } from "./param-bulk"

/** 参数行 / 请求头行的公共字段 */
export interface KeyValueRow {
  id: string
  name: string
  value: string
  description: string
  enabled: boolean
  required: boolean
  example?: string
}

/** 表格内的输入框：平时无边框，hover 显边、聚焦补底色（Apifox 参数表的观感） */
const cellInputClass = "border-transparent bg-transparent hover:border-control-border focus-visible:bg-input"

export interface KeyValueTableProps<T extends KeyValueRow> {
  rows: T[]
  onChange: (rows: T[]) => void
  /** 生成一行空数据：由调用方提供，以便保留 type / dataType 等自有字段 */
  makeRow: () => T
  /** 表格左上角标题（不传则只在右侧显示工具按钮） */
  title?: JSX.Element
  /** 参数名只读（路径参数的名字由 URL 推导而来） */
  nameReadOnly?: boolean
  /** 固定行集合：不提供草稿行、逐行删除与批量编辑（路径参数用） */
  fixedRows?: boolean
  /** 是否显示「必填」列 */
  showRequired?: boolean
  /** 是否显示「示例值」列 */
  showExample?: boolean
  /** 参数名列的占位符 */
  namePlaceholder?: string
  /** 名 / 值两列的表头文案（默认用「参数名 / 参数值」） */
  nameLabel?: string
  valueLabel?: string
  /** 自定义值单元格（Body 的 file/boolean/array/object 等类型使用） */
  renderValue?: (row: T, context: KeyValueCellContext<T>) => JSX.Element
  /** 插入在值与必填/描述之间的业务列 */
  extraColumns?: (context: KeyValueTableContext<T>) => TableColumn<T>[]
  /** 是否允许按拖拽手柄排序 */
  sortable?: boolean
  /** 参数名/请求头名称候选，使用原生 datalist，不限制自由输入 */
  nameSuggestions?: string[]
}

export interface KeyValueCellContext<T extends KeyValueRow> {
  isDraft: boolean
  update: (patch: Partial<T>) => void
  focusNext: (element: HTMLElement) => void
}

export interface KeyValueTableContext<T extends KeyValueRow> {
  isDraft: (row: T) => boolean
  update: (row: T, patch: Partial<T>) => void
}

/** Enter：焦点移到下一行的同一列（末行则落到草稿行），支持连续录入 */
function focusNextRowSameColumn(el: HTMLElement) {
  const cell = el.closest("td")
  const row = cell?.parentElement
  const next = row?.nextElementSibling
  if (!cell || !row || !next) return
  const index = [...row.children].indexOf(cell)
  next.children[index]?.querySelector("input")?.focus()
}

/** 键值参数表 */
export function KeyValueTable<T extends KeyValueRow>(props: KeyValueTableProps<T>) {
  // 草稿行：id 先生成好并保持不变，转正后直接复用，避免行 DOM 重建导致输入框失焦
  const [draft, setDraft] = createSignal<T>(props.makeRow())
  const [bulk, setBulk] = createSignal(false)
  const [bulkText, setBulkText] = createSignal("")
  const [draggedID, setDraggedID] = createSignal("")
  const suggestionsID = `key-value-suggestions-${crypto.randomUUID()}`

  const isDraft = (row: T) => !props.fixedRows && row.id === draft().id
  const displayRows = () => props.fixedRows ? props.rows : [...props.rows, draft()]

  const patchRow = (row: T, patch: Partial<T>) => {
    if (isDraft(row)) {
      // 草稿行首次输入：连同这次输入一起转正（默认启用），并补一行新的草稿行
      const promoted = { ...draft(), ...patch, enabled: true }
      batch(() => {
        setDraft(() => props.makeRow())
        props.onChange([...props.rows, promoted])
      })
      return
    }
    props.onChange(props.rows.map(r => r.id === row.id ? { ...r, ...patch } : r))
  }

  const updateRow = (row: T, field: keyof T, value: string | boolean) => patchRow(row, { [field]: value } as Partial<T>)

  const removeRow = (row: T) => props.onChange(props.rows.filter(r => r.id !== row.id))

  const toggleAll = () => {
    const enabled = !props.rows.length || !props.rows.every(row => row.enabled)
    props.onChange(props.rows.map(row => ({ ...row, enabled })))
  }

  const dropBefore = (target: T) => {
    const sourceID = draggedID()
    setDraggedID("")
    if (!sourceID || sourceID === target.id || isDraft(target)) return
    const source = props.rows.find(row => row.id === sourceID)
    if (!source) return
    const without = props.rows.filter(row => row.id !== sourceID)
    const targetIndex = without.findIndex(row => row.id === target.id)
    if (targetIndex < 0) return
    without.splice(targetIndex, 0, source)
    props.onChange(without)
  }

  const toggleBulk = () => {
    if (bulk()) {
      setBulk(false)
      return
    }
    setBulkText(serializeBulkText(props.rows))
    setBulk(true)
  }

  const applyBulk = (text: string) => {
    setBulkText(text)
    props.onChange(mergeBulkEntries(parseBulkText(text), props.rows, props.makeRow))
  }

  /**
   * 单元格输入框：无边框样式 + Enter 下移。
   * 占位符以取值函数传入并在 JSX 上就地读取，使其编译成细粒度的属性绑定——
   * 若在调用处先算好（草稿行转正会让结果由「添加参数」变成 undefined），
   * 整个单元格会被重新渲染、输入框换成新的 DOM 节点，正在输入的行随即失焦。
   */
  const cellInput = (row: T, field: keyof T & keyof KeyValueRow, placeholder?: () => string | undefined) => (
    <Input
      size="sm"
      value={String(row[field] ?? "")}
      placeholder={placeholder?.()}
      class={cellInputClass}
      onInput={e => updateRow(row, field, e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return
        e.preventDefault()
        focusNextRowSameColumn(e.currentTarget)
      }}
    />
  )

  const columns = (): TableColumn<T>[] => {
    const cols: TableColumn<T>[] = [
      ...(props.sortable ? [{
        header: "", width: "24px", render: (row: T) => (
          <span
            draggable={!isDraft(row)}
            aria-label={t("common.drag")}
            class={cn("inline-flex cursor-grab text-muted-foreground", isDraft(row) && "invisible")}
            onDragStart={(event) => {
              setDraggedID(row.id)
              event.dataTransfer?.setData("text/plain", row.id)
              if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
            }}
            onDragOver={(event) => {
              if (!draggedID() || isDraft(row)) return
              event.preventDefault()
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
            }}
            onDrop={(event) => {
              event.preventDefault()
              dropBefore(row)
            }}
            onDragEnd={() => setDraggedID("")}
          >
            <Icon icon="lucide:grip-vertical" class="h-3.5 w-3.5" />
          </span>
        ),
      }] : []),
      {
        header: props.fixedRows ? "" : (
          <Checkbox
            checked={props.rows.length > 0 && props.rows.every(row => row.enabled)}
            aria-label={t("endpoint.param.enabled")}
            onChange={toggleAll}
          />
        ), width: "32px", render: (row) => (
          // 草稿行还不是真正的参数，复选框置灰占位
          <Checkbox
            checked={isDraft(row) ? false : row.enabled}
            disabled={isDraft(row)}
            aria-label={t("endpoint.param.enabled")}
            onChange={e => updateRow(row, "enabled", e.currentTarget.checked)}
          />
        ),
      },
      {
        header: props.nameLabel ?? t("endpoint.param.name"), render: (row) => (
          props.nameReadOnly
            ? <Input size="sm" value={row.name} readOnly class={cn(cellInputClass, "font-mono")} />
            : (
                <Input
                  size="sm"
                  value={row.name}
                  list={props.nameSuggestions?.length ? suggestionsID : undefined}
                  placeholder={isDraft(row) ? (props.namePlaceholder ?? t("endpoint.param.add")) : undefined}
                  class={cellInputClass}
                  onInput={event => updateRow(row, "name", event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    focusNextRowSameColumn(event.currentTarget)
                  }}
                />
              )
        ),
      },
      {
        header: props.valueLabel ?? t("endpoint.param.value"), render: (row) => props.renderValue
          ? props.renderValue(row, {
              isDraft: isDraft(row),
              update: patch => patchRow(row, patch),
              focusNext: focusNextRowSameColumn,
            })
          : cellInput(row, "value"),
      },
    ]

    cols.push(...(props.extraColumns?.({ isDraft, update: patchRow }) ?? []))

    if (props.showRequired) {
      cols.push({
        header: t("endpoint.param.required"), width: "56px", render: (row) => (
          <Checkbox
            checked={isDraft(row) ? false : row.required}
            disabled={isDraft(row)}
            aria-label={t("endpoint.param.required")}
            onChange={e => updateRow(row, "required", e.currentTarget.checked)}
          />
        ),
      })
    }
    if (props.showExample) {
      cols.push({ header: t("endpoint.param.example"), render: (row) => cellInput(row, "example") })
    }
    cols.push({ header: t("endpoint.param.description"), render: (row) => cellInput(row, "description") })
    cols.push({
      header: "", width: "32px", render: (row) => (
        // 删除按钮常驻会让每行都挂一个红叉；这里只在行 hover 或按钮自身聚焦时显形。
        // 草稿行与固定行（路径参数）不提供删除，但保留单元格以免列宽跳动。
        <Show when={!props.fixedRows && !isDraft(row)}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.delete")}
            class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => removeRow(row)}
          >
            <Icon icon="lucide:trash-2" class="h-3 w-3" />
          </Button>
        </Show>
      ),
    })
    return cols
  }

  return (
    <div class="space-y-1.5">
      <Show when={props.nameSuggestions?.length}>
        <datalist id={suggestionsID}>
          <For each={props.nameSuggestions}>{name => <option value={name} />}</For>
        </datalist>
      </Show>
      <Show when={props.title || !props.fixedRows}>
        <div class="flex items-center justify-between gap-2 min-h-7">
          <div class="text-sm font-medium text-foreground">{props.title}</div>
          <Show when={!props.fixedRows}>
            <Button variant="ghost" size="sm" class="text-muted-foreground" onClick={toggleBulk}>
              <Icon icon={bulk() ? "lucide:table" : "lucide:pencil-line"} class="h-3 w-3" />
              {bulk() ? t("endpoint.param.tableEdit") : t("endpoint.param.bulkEdit")}
            </Button>
          </Show>
        </div>
      </Show>

      <Show
        when={bulk()}
        fallback={
          <Table
            columns={columns()}
            data={displayRows()}
            rowClass={(row) => cn("group", !isDraft(row) && !row.enabled && "opacity-55")}
            compact
            emptyText={t("endpoint.param.empty")}
          />
        }
      >
        <Textarea
          class="font-mono text-xs min-h-40"
          spellcheck={false}
          value={bulkText()}
          placeholder={t("endpoint.param.bulkPlaceholder")}
          onInput={e => applyBulk(e.currentTarget.value)}
        />
      </Show>
    </div>
  )
}
