// Tabs 标签页组件，封装 Ark UI Tabs
// Ark UI 提供 role="tablist/tab/tabpanel" 语义与方向键导航等无障碍能力；
// 视觉样式仍沿用受控 value 计算，保持与旧实现一致。
import { Tabs as ArkTabs } from "@ark-ui/solid/tabs"
import { For, type JSX, Show, splitProps } from "solid-js"

import { cn } from "@/lib/utils"

export interface Tab {
  /** 标签唯一标识 */
  key: string
  /** 标签显示内容 */
  label: string | JSX.Element
  /** 标签图标 */
  icon?: JSX.Element
  /** 是否可关闭 */
  closable?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

export interface TabsProps {
  /** 标签列表 */
  tabs: Tab[]
  /** 当前激活的标签 key */
  value: string
  /** 标签切换回调 */
  onChange: (key: string) => void
  /** 标签关闭回调 */
  onClose?: (key: string) => void
  /** 标签内容渲染函数 */
  children: (key: string) => JSX.Element
  /** 自定义类名 */
  class?: string
  /** 标签栏右侧额外内容 */
  extra?: JSX.Element
}

/**
 * Tabs 标签页组件
 */
export function Tabs(props: TabsProps) {
  const [local] = splitProps(props, ["tabs", "value", "onChange", "onClose", "children", "class", "extra"])

  return (
    <ArkTabs.Root
      class={cn("flex flex-col h-full", local.class)}
      value={local.value}
      onValueChange={(details) => local.onChange(details.value)}
    >
      {/* 卡片式标签栏（Apifox 风格）：
          活动标签抬起为卡片——表面底、上圆角、两侧+顶部描边、无底边（与下方内容融合），
          顶部 2px 品牌色墨条；非活动标签平铺、中性文字、悬停浅底，标签间细分隔线。 */}
      <div class="flex items-stretch shrink-0 relative h-11 bg-surface-alt">
        {/* 底部基线：活动卡片通过 -mb-px 覆盖它，形成融合效果 */}
        <div class="absolute bottom-0 left-0 right-0 h-px bg-border" />
        <ArkTabs.List class="flex items-stretch overflow-x-auto no-scrollbar flex-1">
          <For each={local.tabs}>
            {(tab) => {
              const active = () => local.value === tab.key
              return (
                <ArkTabs.Trigger
                  value={tab.key}
                  disabled={tab.disabled}
                  class={cn(
                    "group/tab relative flex items-center gap-1.5 pl-3 pr-2 text-sm whitespace-nowrap select-none z-10",
                    "min-w-[92px] max-w-[200px] transition-colors",
                    active()
                      ? "bg-surface text-foreground border-x border-t border-divider rounded-t-lg -mb-px"
                      : "text-muted-foreground border-r border-divider hover:bg-hover hover:text-foreground",
                    tab.disabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {/* 活动标签顶部品牌色墨条 */}
                  <Show when={active()}>
                    <span class="absolute left-0 right-0 top-0 h-0.5 rounded-t-full bg-accent" />
                  </Show>
                  <Show when={tab.icon}>{tab.icon}</Show>
                  <span class="flex-1 truncate">{tab.label}</span>
                  <Show
                    when={tab.closable}
                    fallback={<span class="w-4 shrink-0" />}
                  >
                    <span
                      class={cn(
                        "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        !active() && "opacity-0 group-hover/tab:opacity-100",
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        local.onClose?.(tab.key)
                      }}
                    >
                      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </span>
                  </Show>
                </ArkTabs.Trigger>
              )
            }}
          </For>
        </ArkTabs.List>
        <Show when={local.extra}>
          <div class="shrink-0 flex items-center px-2">{local.extra}</div>
        </Show>
      </div>
      {/* 标签内容 */}
      <ArkTabs.Content value={local.value} class="flex-1 overflow-auto bg-surface">
        {local.children(local.value)}
      </ArkTabs.Content>
    </ArkTabs.Root>
  )
}

/**
 * SideTabs 侧边纵向标签组件（用于设置页面等场景）
 */
export interface SideTabsProps {
  tabs: Tab[]
  value: string
  onChange: (key: string) => void
  children: (key: string) => JSX.Element
  class?: string
}

export function SideTabs(props: SideTabsProps) {
  const [local] = splitProps(props, ["tabs", "value", "onChange", "children", "class"])

  return (
    <ArkTabs.Root
      orientation="vertical"
      class={cn("flex h-full", local.class)}
      value={local.value}
      onValueChange={(details) => local.onChange(details.value)}
    >
      {/* 左侧菜单 */}
      <ArkTabs.List class="w-44 shrink-0 border-r border-border">
        <For each={local.tabs}>
          {(tab) => (
            <ArkTabs.Trigger
              value={tab.key}
              disabled={tab.disabled}
              class={cn(
                "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors select-none",
                local.value === tab.key
                  ? "bg-accent-muted text-accent font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Show when={tab.icon}>{tab.icon}</Show>
              <span>{tab.label}</span>
            </ArkTabs.Trigger>
          )}
        </For>
      </ArkTabs.List>
      {/* 右侧内容 */}
      <ArkTabs.Content value={local.value} class="flex-1 overflow-auto p-4">
        {local.children(local.value)}
      </ArkTabs.Content>
    </ArkTabs.Root>
  )
}
