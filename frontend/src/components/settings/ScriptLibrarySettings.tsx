// 脚本库设置：项目级脚本，供任意前置/后置操作引用
import { Icon } from "@iconify-icon/solid"
import { createSignal, For, onMount, Show } from "solid-js"

import type { ScriptLibrary } from "@/../bindings/PostPigeon/internal/models"
import { ScriptLibraryService } from "@/../bindings/PostPigeon/internal/services"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/ui/code-editor"
import { Input } from "@/components/ui/input"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

export interface ScriptLibrarySettingsProps {
  projectId: string | null
}

export function ScriptLibrarySettings(props: ScriptLibrarySettingsProps) {
  const [scripts, setScripts] = createSignal<ScriptLibrary[]>([])
  const [selectedId, setSelectedId] = createSignal<string>("")
  const [name, setName] = createSignal("")
  const [content, setContent] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  const load = async () => {
    if (!props.projectId) return
    try {
      const list = await ScriptLibraryService.ListScripts(props.projectId)
      setScripts((list || []) as ScriptLibrary[])
      if (!selectedId() && list && list.length > 0) select(list[0])
    } catch (e) { console.error("加载脚本库失败", e) }
  }
  onMount(load)

  const select = (s: ScriptLibrary) => {
    setSelectedId(s.id)
    setName(s.name)
    setContent(s.content)
  }

  const create = async () => {
    if (!props.projectId) return
    try {
      const s = await ScriptLibraryService.CreateScript(props.projectId, t("scriptLib.untitled"), "", "")
      await load()
      if (s) select(s)
    } catch (e) { console.error("新建脚本失败", e) }
  }

  const save = async () => {
    if (!selectedId()) return
    setSaving(true)
    try {
      await ScriptLibraryService.UpdateScript(selectedId(), name(), content(), "")
      await load()
    } catch (e) { console.error("保存脚本失败", e) } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    try {
      await ScriptLibraryService.DeleteScript(id)
      if (selectedId() === id) { setSelectedId(""); setName(""); setContent("") }
      await load()
    } catch (e) { console.error("删除脚本失败", e) }
  }

  return (
    <div class="flex h-full">
      {/* 左侧列表 */}
      <div class="w-56 shrink-0 border-r border-border flex flex-col">
        <div class="p-2 border-b border-border">
          <Button variant="outline" size="sm" class="w-full" onClick={create}><Icon icon="lucide:plus" class="h-3 w-3" />{t("scriptLib.new")}</Button>
        </div>
        <div class="flex-1 overflow-auto">
          <For each={scripts()} fallback={<div class="text-xs text-muted-foreground text-center py-4">{t("scriptLib.empty")}</div>}>
            {(s) => (
              <div
                class={cn("flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer group", selectedId() === s.id ? "bg-accent-muted text-accent" : "hover:bg-muted")}
                onClick={() => select(s)}
              >
                <span class="truncate flex-1">{s.name}</span>
                <Button variant="ghost" size="icon-sm" class="opacity-0 group-hover:opacity-100 h-5 w-5" onClick={(e) => { e.stopPropagation(); remove(s.id) }}>
                  <Icon icon="lucide:trash-2" class="h-3 w-3" />
                </Button>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* 右侧编辑 */}
      <div class="flex-1 min-w-0 flex flex-col p-3 gap-2">
        <Show when={selectedId()} fallback={<div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("scriptLib.selectHint")}</div>}>
          <div class="flex items-center gap-2 shrink-0">
            <Input size="sm" value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder={t("common.name")} class="flex-1" />
            <Button size="sm" onClick={save} disabled={saving()}><Icon icon="lucide:save" class="h-3.5 w-3.5" />{saving() ? t("common.saving") : t("common.save")}</Button>
          </div>
          <div class="flex-1 min-h-0">
            <CodeEditor language="javascript" value={content()} onChange={setContent} placeholder={t("scriptLib.placeholder")} />
          </div>
        </Show>
      </div>
    </div>
  )
}
