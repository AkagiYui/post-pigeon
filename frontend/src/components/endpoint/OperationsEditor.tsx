// 前置/后置操作编辑器（受控）
// 每个阶段（pre/post）维护一组有序操作，支持 脚本 / 断言 / 提取变量 / 等待 / 引用脚本库，
// 可单独启用/禁用、上移下移、删除。脚本使用 CodeMirror 编辑。
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-solid"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"

import type { ScriptLibrary } from "@/../bindings/post-pigeon/internal/models"
import { ScriptLibraryService } from "@/../bindings/post-pigeon/internal/services"
import { type OperationRow, emptyOperation } from "@/components/endpoint/EndpointDetail"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/ui/code-editor"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import type { OperationStage, OperationType } from "@/lib/types"

export interface OperationsEditorProps {
  operations: OperationRow[]
  onChange: (ops: OperationRow[]) => void
  projectId?: string
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
  const [stage, setStage] = createSignal<OperationStage>("pre")
  const [libraries, setLibraries] = createSignal<ScriptLibrary[]>([])

  onMount(async () => {
    if (!props.projectId) return
    try {
      const list = await ScriptLibraryService.ListScripts(props.projectId)
      setLibraries((list || []) as ScriptLibrary[])
    } catch (e) { console.error("获取脚本库失败", e) }
  })

  // 当前阶段的操作（保持在整表中的索引以便原地更新）
  const stageOps = createMemo(() =>
    props.operations.map((op, idx) => ({ op, idx })).filter(x => x.op.stage === stage()),
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
      {/* 阶段切换 */}
      <div class="flex gap-1 mb-3 shrink-0">
        <For each={tabs}>
          {(tab) => (
            <button
              class={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors",
                stage() === tab.key ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setStage(tab.key)}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      <div class="flex-1 flex flex-col gap-2 min-h-0">
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
        <Plus class="h-3 w-3" />
        {t("op.add")}
      </Button>
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
        <GripVertical class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="checkbox"
          checked={op().enabled}
          onChange={(e) => props.onUpdate({ enabled: e.currentTarget.checked })}
          class="rounded border-border shrink-0"
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
        <Button variant="ghost" size="icon-sm" onClick={props.onMoveUp}><ChevronUp class="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onMoveDown}><ChevronDown class="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={props.onRemove}><Trash2 class="h-3 w-3" /></Button>
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
