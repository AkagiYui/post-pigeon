// 代理设置面板：全局级与项目级共用。
// 维护一组代理条目（内置「系统代理」「不使用代理」+ 自定义 http/socks5 条目），
// 并选择其中之一作为默认。项目级额外提供「跟随全局设置」开关（默认开启）。
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, For, on, Show } from "solid-js"
import { createStore } from "solid-js/store"

import { ProxyConfig, ScopeProxySettings } from "@/../bindings/post-pigeon/internal/models"
import { ProxyService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"

/** 自定义代理编辑行（前端态） */
interface ProxyRow {
  id: string
  name: string
  protocol: string // http | socks5
  host: string
  port: number
  auth: boolean
  username: string
  password: string
  bypass: string
}

export interface ProxySettingsPanelProps {
  /** 作用域：全局或项目 */
  scope: "global" | "project"
  /** 项目 ID（scope=project 时必填） */
  projectId?: string | null
}

/** 内置条目 ID */
const BUILTIN_SYSTEM = "system"
const BUILTIN_NONE = "none"

export function ProxySettingsPanel(props: ProxySettingsPanelProps) {
  const isProject = () => props.scope === "project"

  const [followGlobal, setFollowGlobal] = createSignal(true)
  const [activeId, setActiveId] = createSignal(BUILTIN_SYSTEM)
  const [rows, setRows] = createStore<ProxyRow[]>([])
  const [saving, setSaving] = createSignal(false)
  const [saved, setSaved] = createSignal(false)

  const protocolOptions = () => [
    { value: "http", label: "HTTP" },
    { value: "socks5", label: "SOCKS5" },
  ]

  // 当前默认选择区是否禁用（项目级且勾选了跟随全局）
  const selectionDisabled = () => isProject() && followGlobal()

  const load = async () => {
    try {
      const s = props.scope === "global"
        ? await ProxyService.GetGlobalProxySettings()
        : props.projectId
          ? await ProxyService.GetProjectProxySettings(props.projectId)
          : null
      if (!s) return
      setFollowGlobal(isProject() ? !!s.followGlobal : false)
      setActiveId(s.activeId || BUILTIN_SYSTEM)
      const customs = (s.proxies || [])
        .filter(p => p.id !== BUILTIN_SYSTEM && p.id !== BUILTIN_NONE)
        .map<ProxyRow>(p => ({
          id: p.id || crypto.randomUUID(),
          name: p.name,
          protocol: p.protocol || "http",
          host: p.host,
          port: p.port || 0,
          auth: p.auth,
          username: p.username,
          password: p.password,
          bypass: p.bypass,
        }))
      setRows(customs)
    } catch (e) {
      console.error("加载代理设置失败", e)
    }
  }

  // 全局：挂载即加载；项目：随 projectId 变化加载
  createEffect(on(() => props.projectId, () => { load() }))

  const addRow = () => {
    setSaved(false)
    setRows(prev => [...prev, {
      id: crypto.randomUUID(), name: "", protocol: "http", host: "", port: 8080,
      auth: false, username: "", password: "", bypass: "",
    }])
  }

  const removeRow = (id: string) => {
    setSaved(false)
    setRows(prev => prev.filter(r => r.id !== id))
    // 若删除的是当前默认，则回退到系统代理
    if (activeId() === id) setActiveId(BUILTIN_SYSTEM)
  }

  const update = (index: number, field: keyof ProxyRow, value: string | number | boolean) => {
    setSaved(false)
    setRows(index, field as any, value as any)
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const settings = new ScopeProxySettings({
        followGlobal: isProject() ? followGlobal() : false,
        activeId: activeId(),
        proxies: rows.map(r => new ProxyConfig({
          id: r.id,
          name: r.name.trim() || t("proxy.custom.untitled"),
          mode: "custom",
          protocol: r.protocol,
          host: r.host.trim(),
          port: Number(r.port) || 0,
          auth: r.auth,
          username: r.username,
          password: r.password,
          bypass: r.bypass,
        })),
      })
      if (props.scope === "global") {
        await ProxyService.SaveGlobalProxySettings(settings)
      } else if (props.projectId) {
        await ProxyService.SaveProjectProxySettings(props.projectId, settings)
      }
      setSaved(true)
      await load()
    } catch (e) {
      console.error("保存代理设置失败", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="flex flex-col gap-4 h-full">
      <div>
        <h2 class="text-base font-medium">{t("proxy.title")}</h2>
        <p class="text-sm text-muted-foreground mt-1">
          {isProject() ? t("proxy.project.hint") : t("proxy.global.hint")}
        </p>
      </div>

      {/* 项目级：跟随全局设置 */}
      <Show when={isProject()}>
        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox checked={followGlobal()} onChange={(e) => { setFollowGlobal(e.currentTarget.checked); setSaved(false) }} />
          <span class="font-medium">{t("proxy.followGlobal")}</span>
        </label>
      </Show>

      <div class={cn("flex-1 min-h-0 overflow-auto space-y-3 pr-1", selectionDisabled() && "opacity-50 pointer-events-none")}>
        {/* 默认选择说明 */}
        <p class="text-xs text-muted-foreground">{t("proxy.default.hint")}</p>

        {/* 内置：系统代理 / 不使用代理 */}
        <BuiltinRow
          label={t("proxy.builtin.system")}
          desc={t("proxy.builtin.system.desc")}
          icon="lucide:monitor-cog"
          selected={activeId() === BUILTIN_SYSTEM}
          onSelect={() => { setActiveId(BUILTIN_SYSTEM); setSaved(false) }}
        />
        <BuiltinRow
          label={t("proxy.builtin.none")}
          desc={t("proxy.builtin.none.desc")}
          icon="lucide:ban"
          selected={activeId() === BUILTIN_NONE}
          onSelect={() => { setActiveId(BUILTIN_NONE); setSaved(false) }}
        />

        {/* 自定义代理条目 */}
        <For each={rows}>
          {(row, index) => (
            <div class={cn(
              "rounded-md border p-3 space-y-2.5 transition-colors",
              activeId() === row.id ? "border-accent bg-accent-muted/30" : "border-border",
            )}>
              {/* 头部：默认单选 + 名称 + 删除 */}
              <div class="flex items-center gap-2">
                <Radio selected={activeId() === row.id} onSelect={() => { setActiveId(row.id); setSaved(false) }} />
                <Input
                  size="sm"
                  class="flex-1"
                  value={row.name}
                  placeholder={t("proxy.name")}
                  onInput={(e) => update(index(), "name", e.currentTarget.value)}
                />
                <Button variant="ghost" size="icon-sm" onClick={() => removeRow(row.id)} title={t("common.delete")}>
                  <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* 协议 + 主机 + 端口 */}
              <div class="flex items-center gap-2">
                <Select
                  options={protocolOptions()}
                  value={row.protocol}
                  onChange={(v) => update(index(), "protocol", v)}
                  size="sm"
                  class="w-28 shrink-0"
                />
                <Input
                  size="sm"
                  class="flex-1"
                  value={row.host}
                  placeholder={t("proxy.host")}
                  onInput={(e) => update(index(), "host", e.currentTarget.value)}
                />
                <Input
                  size="sm"
                  type="number"
                  class="w-24 shrink-0"
                  value={String(row.port)}
                  placeholder={t("proxy.port")}
                  onInput={(e) => update(index(), "port", parseInt(e.currentTarget.value) || 0)}
                />
              </div>

              {/* 身份验证 */}
              <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox checked={row.auth} onChange={(e) => update(index(), "auth", e.currentTarget.checked)} />
                <span>{t("proxy.auth")}</span>
              </label>
              <Show when={row.auth}>
                <div class="flex items-center gap-2 pl-6">
                  <Input
                    size="sm"
                    class="flex-1"
                    value={row.username}
                    placeholder={t("proxy.username")}
                    onInput={(e) => update(index(), "username", e.currentTarget.value)}
                  />
                  <Input
                    size="sm"
                    type="password"
                    class="flex-1"
                    value={row.password}
                    placeholder={t("proxy.password")}
                    onInput={(e) => update(index(), "password", e.currentTarget.value)}
                  />
                </div>
              </Show>

              {/* 代理绕过 */}
              <div>
                <label class="text-xs text-muted-foreground">{t("proxy.bypass")}</label>
                <Textarea
                  value={row.bypass}
                  placeholder={t("proxy.bypass.placeholder")}
                  rows={2}
                  class="w-full resize-y min-h-10 px-2 py-1.5 text-sm mt-1"
                  onInput={(e) => update(index(), "bypass", e.currentTarget.value)}
                />
              </div>
            </div>
          )}
        </For>

        <Button variant="outline" size="sm" onClick={addRow}>
          <Icon icon="lucide:plus" class="h-3.5 w-3.5" />{t("proxy.addCustom")}
        </Button>
      </div>

      <div class="flex items-center justify-end gap-3 shrink-0 border-t border-border pt-3">
        {saved() && <span class="text-sm text-green-600 dark:text-green-400">{t("common.saved")}</span>}
        <Button onClick={save} disabled={saving()}>{saving() ? t("common.saving") : t("common.save")}</Button>
      </div>
    </div>
  )
}

/** 内置代理行（系统 / 不使用），带默认单选 */
function BuiltinRow(props: { label: string; desc: string; icon: string; selected: boolean; onSelect: () => void }) {
  return (
    <div
      class={cn(
        "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
        props.selected ? "border-accent bg-accent-muted/30" : "border-border hover:bg-muted/50",
      )}
      onClick={props.onSelect}
    >
      <Radio selected={props.selected} onSelect={props.onSelect} />
      <Icon icon={props.icon} class="h-4 w-4 text-muted-foreground shrink-0" />
      <div class="min-w-0">
        <div class="text-sm font-medium">{props.label}</div>
        <div class="text-xs text-muted-foreground truncate">{props.desc}</div>
      </div>
    </div>
  )
}

/** 单选圆点 */
function Radio(props: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      class={cn(
        "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
        props.selected ? "border-accent" : "border-muted-foreground/40 hover:border-muted-foreground",
      )}
      onClick={(e) => { e.stopPropagation(); props.onSelect() }}
      role="radio"
      aria-checked={props.selected}
    >
      <Show when={props.selected}>
        <span class="h-2 w-2 rounded-full bg-accent" />
      </Show>
    </button>
  )
}
