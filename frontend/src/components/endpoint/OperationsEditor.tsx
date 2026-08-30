// 前置/后置操作编辑器（受控）
// 每个阶段（pre/post）维护一组有序操作，支持 脚本 / 断言 / 提取变量 / 等待 / 引用脚本库，
// 可单独启用/禁用、上移下移、删除。脚本使用 CodeMirror 编辑。
import { Icon } from "@iconify-icon/solid"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"

import type { ScriptLibrary } from "@/../bindings/PostPigeon/internal/models"
import { ScriptLibraryService } from "@/../bindings/PostPigeon/internal/services"
import { emptyOperation, type InheritedOperationRow, type OperationRow } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CodeEditor } from "@/components/ui/code-editor"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import type { OperationStage, OperationType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toastError } from "@/stores/toast"

export interface OperationsEditorProps {
  operations: OperationRow[]
  onChange: (ops: OperationRow[]) => void
  projectId?: string
  /** 固定到单一阶段（pre/post）：提供时隐藏内部阶段切换，仅编辑该阶段。 */
  stage?: OperationStage
  inheritedOperations?: InheritedOperationRow[]
  inheritEnabled?: boolean
  onInheritEnabledChange?: (enabled: boolean) => void
  /** null 表示删除当前作用域覆盖、恢复跟随上级。 */
  onInheritedOverride?: (operationId: string, enabled: boolean | null) => void
}

const opTypeOptions = () => [
  { value: "script", label: t("op.type.script") },
  { value: "assert", label: t("op.type.assert") },
  { value: "extractVar", label: t("op.type.extractVar") },
  { value: "wait", label: t("op.type.wait") },
  { value: "libraryScript", label: t("op.type.libraryScript") },
]

const sourceOptions = [
  { value: "responseJson", label: "JSON (JSONPath)" },
  { value: "responseText", label: "Text" },
  { value: "responseHeader", label: "Header" },
  { value: "statusCode", label: "Status Code" },
  { value: "responseTime", label: "Response Time" },
]

const comparisonOptions = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "not contains" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "exists", label: "exists" },
  { value: "notExists", label: "not exists" },
]

const scopeOptions = [
  { value: "environment", label: t("op.scope.environment") },
  { value: "global", label: t("op.scope.global") },
  { value: "collection", label: t("op.scope.collection") },
  { value: "local", label: t("op.scope.local") },
]

export function OperationsEditor(props: OperationsEditorProps) {
  // 内部阶段状态仅在未固定阶段（未传入 props.stage）时使用
  const [internalStage, setInternalStage] = createSignal<OperationStage>("pre")
  const stage = () => props.stage ?? internalStage()
  const [libraries, setLibraries] = createSignal<ScriptLibrary[]>([])
  const [inheritedOpen, setInheritedOpen] = createSignal(false)

  onMount(async () => {
    if (!props.projectId) return
    try {
      const list = await ScriptLibraryService.ListScripts(props.projectId)
      setLibraries((list || []) as ScriptLibrary[])
    } catch (e) { toastError(e, "error.op.loadFailed") }
  })

  // 当前阶段的操作（保持在整表中的索引以便原地更新）
  const stageOps = createMemo(() =>
    props.operations.map((op, idx) => ({ op, idx })).filter(x => x.op.stage === stage()),
  )
  const inheritedStageOps = createMemo(() =>
    (props.inheritedOperations || []).filter(item => item.operation.stage === stage()),
  )

  const updateOp = (id: string, patch: Partial<OperationRow>) => {
    props.onChange(props.operations.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  const addOp = () => {
    props.onChange([...props.operations, emptyOperation(stage(), "script")])
  }

  const removeOp = (id: string) => {
    props.onChange(props.operations.filter(o => o.id !== id))
  }

  // 在当前阶段内上移/下移（交换两条操作在整表中的位置）
  const moveOp = (id: string, dir: -1 | 1) => {
    const list = stageOps()
    const pos = list.findIndex(x => x.op.id === id)
    const target = pos + dir
    if (target < 0 || target >= list.length) return
    const all = [...props.operations]
    const a = list[pos].idx
    const b = list[target].idx
    ;[all[a], all[b]] = [all[b], all[a]]
    props.onChange(all)
  }

  const tabs: { key: OperationStage; label: string }[] = [
    { key: "pre", label: t("op.stage.pre") },
    { key: "post", label: t("op.stage.post") },
  ]

  return (
    <div class="p-3 h-full overflow-auto flex flex-col">
      {/* 阶段切换（固定阶段时隐藏） */}
      <Show when={!props.stage}>
        <div class="flex gap-1 mb-3 shrink-0">
          <For each={tabs}>
            {(tab) => (
              <button
                class={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors",
                  stage() === tab.key ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setInternalStage(tab.key)}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="flex-1 flex flex-col gap-2 min-h-0">
        <Show when={inheritedStageOps().length > 0}>
          <div class="border border-border rounded-md overflow-hidden bg-muted/20">
            <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left" onClick={() => setInheritedOpen(v => !v)}>
              <Icon icon={inheritedOpen() ? "lucide:chevron-down" : "lucide:chevron-right"} class="h-3.5 w-3.5" />
              <span class="font-medium">继承的操作</span>
              <span class="text-muted-foreground">{inheritedStageOps().length}</span>
              <Show when={props.onInheritEnabledChange}>
                <span class="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={props.inheritEnabled !== false} onChange={(e) => props.onInheritEnabledChange?.(e.currentTarget.checked)} />
                  <span>启用继承</span>
                </span>
              </Show>
            </button>
            <Show when={inheritedOpen()}>
              <div class="border-t border-border p-2 flex flex-col gap-2">
                <For each={inheritedStageOps()}>
                  {(item) => <InheritedOperationCard item={item} disabled={props.inheritEnabled === false} onOverride={props.onInheritedOverride} />}
                </For>
              </div>
            </Show>
          </div>
        </Show>
        <For each={stageOps()} fallback={<div class="text-sm text-muted-foreground text-center py-6">{t("op.empty")}</div>}>
          {(item) => (
            <OperationCard
              op={item.op}
              libraries={libraries()}
              onUpdate={(patch) => updateOp(item.op.id, patch)}
              onRemove={() => removeOp(item.op.id)}
              onMoveUp={() => moveOp(item.op.id, -1)}
              onMoveDown={() => moveOp(item.op.id, 1)}
            />
          )}
        </For>
      </div>

      <Button variant="outline" size="sm" class="mt-2 shrink-0 self-start" onClick={addOp}>
        <Icon icon="lucide:plus" class="h-3 w-3" />
        {t("op.add")}
      </Button>
    </div>
  )
}

function InheritedOperationCard(props: {
  item: InheritedOperationRow
  disabled: boolean
  onOverride?: (operationId: string, enabled: boolean | null) => void
}) {
  const op = () => props.item.operation
  return (
    <div class={cn("border border-border rounded-md bg-background", (props.disabled || !op().enabled) && "opacity-60")}>
      <div class="flex items-center gap-2 px-2 py-1.5">
        <Checkbox
          checked={op().enabled}
          disabled={props.disabled || !props.onOverride}
          onChange={(e) => props.onOverride?.(op().id, e.currentTarget.checked)}
        />
        <span class="text-xs font-medium">{op().name || opTypeOptions().find(x => x.value === op().type)?.label || op().type}</span>
        <span class="text-[11px] text-muted-foreground">来自 {props.item.sourceName || props.item.sourceType}</span>
        <Show when={props.item.overridden}>
          <Button class="ml-auto" variant="ghost" size="sm" onClick={() => props.onOverride?.(op().id, null)}>
            <Icon icon="lucide:rotate-ccw" class="h-3 w-3" />恢复跟随
          </Button>
        </Show>
      </div>
      <Show when={(op().type === "script" || op().type === "libraryScript") && op().script}>
        <div class="h-24 border-t border-border"><CodeEditor language="javascript" value={op().script} readOnly /></div>
      </Show>
    </div>
  )
}

/** 单个操作卡片 */
function OperationCard(props: {
  op: OperationRow
  libraries: ScriptLibrary[]
  onUpdate: (patch: Partial<OperationRow>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const op = () => props.op
  return (
    <div class={cn("border border-border rounded-md overflow-hidden", !op().enabled && "opacity-60")}>
      {/* 卡片头 */}
      <div class="flex items-center gap-2 px-2 py-1.5 bg-muted/40 border-b border-border">
        <Icon icon="lucide:grip-vertical" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Checkbox
          checked={op().enabled}
          onChange={(e) => props.onUpdate({ enabled: e.currentTarget.checked })}
          class="shrink-0"
        />
        <Select
          options={opTypeOptions()}
          value={op().type}
          onChange={(v) => props.onUpdate({ type: v as OperationType })}
          size="sm"
          class="w-28 shrink-0"
        />
        <Input
          size="sm"
          value={op().name}
          onInput={(e) => props.onUpdate({ name: e.currentTarget.value })}
          placeholder={t("op.name")}
          class="flex-1"
        />
        <Button variant="ghost" size="icon-sm" onClick={props.onMoveUp}><Icon icon="lucide:chevron-up" class="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onMoveDown}><Icon icon="lucide:chevron-down" class="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onRemove}><Icon icon="lucide:trash-2" class="h-3 w-3" /></Button>
      </div>

      {/* 卡片体 */}
      <div class="p-2">
        <Show when={op().type === "script"}>
          <div class="h-48">
            <CodeEditor language="javascript" value={op().script} onChange={(v) => props.onUpdate({ script: v })} placeholder={t("op.scriptPlaceholder")} />
          </div>
        </Show>

        <Show when={op().type === "libraryScript"}>
          <Select
            options={[{ value: "", label: t("op.selectLibrary") }, ...props.libraries.map(l => ({ value: l.id, label: l.name }))]}
            value={op().libraryId}
            onChange={(v) => props.onUpdate({ libraryId: v })}
            class="w-full"
          />
        </Show>

        <Show when={op().type === "assert"}>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <Select options={sourceOptions} value={op().assertSource} onChange={(v) => props.onUpdate({ assertSource: v })} size="sm" class="w-40" />
              <Show when={op().assertSource === "responseJson" || op().assertSource === "responseHeader"}>
                <Input size="sm" value={op().assertExpression} onInput={(e) => props.onUpdate({ assertExpression: e.currentTarget.value })} placeholder={op().assertSource === "responseJson" ? "$.code" : "X-Header"} class="flex-1" />
              </Show>
            </div>
            <div class="flex items-center gap-2">
              <Select options={comparisonOptions} value={op().assertComparison} onChange={(v) => props.onUpdate({ assertComparison: v })} size="sm" class="w-32" />
              <Input size="sm" value={op().assertTarget} onInput={(e) => props.onUpdate({ assertTarget: e.currentTarget.value })} placeholder={t("op.expected")} class="flex-1" />
            </div>
          </div>
        </Show>

        <Show when={op().type === "extractVar"}>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <Input size="sm" value={op().varName} onInput={(e) => props.onUpdate({ varName: e.currentTarget.value })} placeholder={t("op.varName")} class="flex-1" />
              <Select options={scopeOptions} value={op().varScope} onChange={(v) => props.onUpdate({ varScope: v })} size="sm" class="w-32" />
            </div>
            <div class="flex items-center gap-2">
              <Select options={sourceOptions.filter(s => s.value !== "statusCode" && s.value !== "responseTime")} value={op().varSource} onChange={(v) => props.onUpdate({ varSource: v })} size="sm" class="w-40" />
              <Input size="sm" value={op().varExpression} onInput={(e) => props.onUpdate({ varExpression: e.currentTarget.value })} placeholder="$.data.token" class="flex-1" />
            </div>
          </div>
        </Show>

        <Show when={op().type === "wait"}>
          <div class="flex items-center gap-2">
            <Input size="sm" type="number" value={String(op().waitMs)} onInput={(e) => props.onUpdate({ waitMs: Number(e.currentTarget.value) || 0 })} class="w-32" />
            <span class="text-sm text-muted-foreground">{t("op.milliseconds")}</span>
          </div>
        </Show>
      </div>
    </div>
  )
}
