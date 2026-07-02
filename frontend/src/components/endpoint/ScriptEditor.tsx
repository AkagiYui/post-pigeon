// 脚本编辑器（受控组件）
// 前置脚本：请求发送前执行；后置脚本：响应返回后执行。第一版为同步脚本。
import { createSignal } from "solid-js"

import { Textarea } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

/** ScriptEditor 变更补丁：只携带本次变化的字段 */
export interface ScriptEditorPatch {
  preRequestScript?: string
  postResponseScript?: string
}

export interface ScriptEditorProps {
  preRequestScript: string
  postResponseScript: string
  onChange: (patch: ScriptEditorPatch) => void
}

export function ScriptEditor(props: ScriptEditorProps) {
  const [active, setActive] = createSignal<"pre" | "post">("pre")

  const tabs: { key: "pre" | "post"; label: string }[] = [
    { key: "pre", label: t("endpoint.script.preRequest") },
    { key: "post", label: t("endpoint.script.postResponse") },
  ]

  return (
    <div class="p-3 h-full overflow-hidden flex flex-col">
      {/* 前置 / 后置切换 */}
      <div class="flex gap-1 mb-2 shrink-0">
        {tabs.map((tab) => (
          <button
            class={cn(
              "px-2.5 py-1 text-xs rounded-md transition-colors",
              active() === tab.key
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 提示 */}
      <p class="text-xs text-muted-foreground mb-2 shrink-0">
        {active() === "pre" ? t("endpoint.script.preHint") : t("endpoint.script.postHint")}
      </p>

      {/* 编辑区 */}
      <div class="flex-1 min-h-0">
        {active() === "pre" ? (
          <Textarea
            value={props.preRequestScript}
            onInput={(e) => props.onChange({ preRequestScript: e.currentTarget.value })}
            placeholder={t("endpoint.script.placeholderPre")}
            class="h-full font-mono text-sm"
            spellcheck={false}
          />
        ) : (
          <Textarea
            value={props.postResponseScript}
            onInput={(e) => props.onChange({ postResponseScript: e.currentTarget.value })}
            placeholder={t("endpoint.script.placeholderPost")}
            class="h-full font-mono text-sm"
            spellcheck={false}
          />
        )}
      </div>
    </div>
  )
}
