// 脚本编辑器（受控组件）
// 前置脚本：请求发送前执行；后置脚本：响应返回后执行。第一版为同步脚本。
import { ChevronDown, ChevronRight } from "lucide-solid"
import { createSignal, For, onMount, Show } from "solid-js"

import type { LibraryInfo } from "@/../bindings/post-pigeon/internal/scripting"
import { HTTPService } from "@/../bindings/post-pigeon/internal/services"
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
  const [libs, setLibs] = createSignal<LibraryInfo[]>([])
  const [libsOpen, setLibsOpen] = createSignal(false)

  // 内置库清单由后端提供（唯一事实来源：internal/scripting/libs/manifest.json）
  onMount(async () => {
    try {
      const list = await HTTPService.ListScriptLibraries()
      setLibs((list || []) as LibraryInfo[])
    } catch (e) {
      console.error("获取脚本内置库清单失败", e)
    }
  })

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

      {/* 可用内置库（由后端清单驱动） */}
      <div class="shrink-0 mt-2 border-t border-border pt-2">
        <button
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setLibsOpen((v) => !v)}
        >
          {libsOpen() ? <ChevronDown class="h-3 w-3" /> : <ChevronRight class="h-3 w-3" />}
          {t("endpoint.script.libraries", { count: libs().length })}
        </button>
        <Show when={libsOpen()}>
          <div class="mt-2 flex flex-col gap-1 max-h-40 overflow-auto">
            <For each={libs()}>
              {(lib) => (
                <div class="flex items-baseline gap-2 text-xs">
                  <span class="font-medium text-foreground shrink-0">{lib.name}</span>
                  <Show when={lib.version && lib.version !== "-"}>
                    <span class="text-muted-foreground shrink-0">v{lib.version}</span>
                  </Show>
                  <span class="shrink-0 text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{lib.kind}</span>
                  <Show when={lib.usage}>
                    <code class="truncate text-muted-foreground font-mono" title={lib.usage}>{lib.usage}</code>
                  </Show>
                </div>
              )}
            </For>
          </div>
          <p class="mt-2 text-[11px] text-muted-foreground">{t("endpoint.script.librariesHint")}</p>
        </Show>
      </div>
    </div>
  )
}
