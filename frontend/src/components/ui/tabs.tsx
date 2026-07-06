// Tabs 标签页组件，封装 Kobalte Tabs
// Kobalte 提供 role="tablist/tab/tabpanel" 语义与方向键导航等无障碍能力；
// 视觉样式仍沿用受控 value 计算，保持与旧实现一致。
import { Tabs as KTabs } from "@kobalte/core/tabs"
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
    <KTabs
      class={cn("flex flex-col h-full", local.class)}
      value={local.value}
      onChange={local.onChange}
    >
      {/* 标签栏 */}
      <div class="flex items-center shrink-0 relative">
        {/* 底部分割线 */}
        <div class="absolute bottom-0 left-0 right-0 h-px bg-border" />
        <KTabs.List class="flex items-center overflow-x-auto no-scrollbar flex-1">
          <For each={local.tabs}>
            {(tab) => (
              <KTabs.Trigger
                value={tab.key}
                disabled={tab.disabled}
                class={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm border-b-2 transition-colors whitespace-nowrap select-none relative z-10",
                  local.value === tab.key
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  tab.disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <Show when={tab.icon}>{tab.icon}</Show>
                <span>{tab.label}</span>
                <Show when={tab.closable}>
                  <span
                    class="ml-1 rounded-sm p-0.5 hover:bg-muted transition-colors"
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
              </KTabs.Trigger>
            )}
          </For>
        </KTabs.List>
        <Show when={local.extra}>
          <div class="shrink-0 px-2">{local.extra}</div>
        </Show>
      </div>
      {/* 标签内容 */}
      <KTabs.Content value={local.value} class="flex-1 overflow-auto">
        {local.children(local.value)}
      </KTabs.Content>
    </KTabs>
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
    <KTabs
      orientation="vertical"
      class={cn("flex h-full", local.class)}
      value={local.value}
      onChange={local.onChange}
    >
      {/* 左侧菜单 */}
      <KTabs.List class="w-44 shrink-0 border-r border-border">
        <For each={local.tabs}>
          {(tab) => (
            <KTabs.Trigger
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
            </KTabs.Trigger>
          )}
        </For>
      </KTabs.List>
      {/* 右侧内容 */}
      <KTabs.Content value={local.value} class="flex-1 overflow-auto p-4">
        {local.children(local.value)}
      </KTabs.Content>
    </KTabs>
  )
}
