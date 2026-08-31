import { Menu } from "@ark-ui/solid/menu"
import { Icon } from "@iconify-icon/solid"
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"

import { t } from "@/hooks/useI18n"
import { cn } from "@/lib/utils"
import { convertHTTPToWSProtocol } from "@/lib/ws-protocol"

import type { EnvironmentBaseURLOption } from "./editor-types"

export interface EnvironmentSelectorProps {
  baseUrl: string
  environmentBaseUrls?: EnvironmentBaseURLOption[]
  currentEnvironmentId?: string
  autoConvertWSProtocol?: boolean
  protocol?: "http" | "websocket"
  onEnvironmentChange?: (id: string) => void
  onEditEnvironment?: (id: string) => void
}

/** 地址展示与环境选择共用；编辑按钮是独立菜单项，不会同时切换环境。 */
export function EnvironmentSelector(props: EnvironmentSelectorProps) {
  const [compact, setCompact] = createSignal(false)
  let container: HTMLDivElement | undefined
  const options = () => props.environmentBaseUrls ?? []
  const selected = () => options().find(item => item.environmentId === props.currentEnvironmentId)
  const display = (url: string) => convertHTTPToWSProtocol(url, !!props.autoConvertWSProtocol)
  const unset = () => t("endpoint.baseUrl.notSet")
  const hint = () => t(props.protocol === "websocket" ? "endpoint.baseUrl.hintWS" : "endpoint.baseUrl.hint")

  createEffect(() => {
    const parent = container?.parentElement
    if (!parent) return
    setCompact(parent.getBoundingClientRect().width <= 540)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setCompact(entry.contentRect.width <= 540)
    })
    observer.observe(parent)
    onCleanup(() => observer.disconnect())
  })

  return (
    <div ref={container} class="shrink-0 text-xs" data-compact={compact()}>
      <Show when={options().length > 0} fallback={
        <span class="inline-flex items-center gap-1 h-6 px-2 text-xs rounded text-muted-foreground cursor-default whitespace-nowrap" title={t("environment.none")} aria-label={t("environment.none")}>
          <Icon icon="lucide:link-2" class="h-3 w-3 shrink-0" /><Show when={!compact()}>{t("environment.none")}</Show>
        </span>
      }>
        <Menu.Root
          positioning={{ placement: "bottom-start", gutter: 4, strategy: "fixed" }}
          onSelect={({ value }) => {
            if (value.startsWith("edit:")) props.onEditEnvironment?.(value.slice(5))
            else props.onEnvironmentChange?.(value)
          }}
        >
          <Menu.Trigger
            aria-label={t("environment.select")}
            title={`${selected() ? display(props.baseUrl) || unset() : t("environment.select")}\n${hint()}`}
            class={cn(
              "inline-flex items-center gap-1 h-6 px-2 text-xs rounded cursor-pointer select-none transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              props.baseUrl ? "text-accent bg-accent-muted hover:bg-accent-muted/70" : "text-muted-foreground hover:bg-hover",
            )}
          >
            <Icon icon="lucide:link-2" class="h-3 w-3 shrink-0" />
            <Show when={!compact() && selected()}><span>{display(props.baseUrl) || unset()}</span></Show>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner class="z-[101]">
              <Menu.Content
                class="anim-pop-in w-max min-w-80 max-w-[min(640px,calc(100vw-16px))] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-xl outline-none"
                style={{ "max-height": "min(24rem, var(--available-height, 80vh))" }}
              >
                <Menu.RadioItemGroup value={selected()?.environmentId ?? ""} class="flex flex-col gap-0.5">
                  <For each={options()}>{item => (
                    <div class={cn("group flex items-center rounded transition-colors", item.environmentId === props.currentEnvironmentId ? "bg-accent-muted text-accent" : "text-foreground hover:bg-hover")}>
                      <Menu.RadioItem value={item.environmentId} valueText={`${item.environmentName} ${item.baseUrl}`} class="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1 text-sm rounded outline-none cursor-pointer select-none transition-colors data-[highlighted]:bg-hover data-[state=checked]:data-[highlighted]:bg-accent-muted">
                        <span class="w-4 shrink-0 flex items-center justify-center"><Menu.ItemIndicator><Icon icon="lucide:check" class="w-3.5 h-3.5" /></Menu.ItemIndicator></span>
                        <Menu.ItemText class="truncate text-sm flex-1 min-w-0">{display(item.baseUrl) || unset()}</Menu.ItemText>
                        <span class="max-w-70 truncate text-xs text-muted-foreground shrink-0" title={item.environmentName}>{item.environmentName}</span>
                      </Menu.RadioItem>
                      <Show when={props.onEditEnvironment}>
                        <Menu.Item value={`edit:${item.environmentId}`} aria-label={t("environment.editNamed", { name: item.environmentName })} title={t("environment.editNamed", { name: item.environmentName })}
                          class="p-1 rounded text-muted-foreground outline-none opacity-0 group-hover:opacity-100 data-[highlighted]:opacity-100 data-[highlighted]:bg-hover hover:text-accent cursor-pointer">
                          <Icon icon="lucide:pencil" class="size-3.5" />
                        </Menu.Item>
                      </Show>
                    </div>
                  )}</For>
                </Menu.RadioItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Show>
    </div>
  )
}
