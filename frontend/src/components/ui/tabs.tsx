// Tabs 标签页组件
import { createSignal, For, type JSX, Show, splitProps } from "solid-js"

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
    <div class={cn("flex flex-col h-full", local.class)}>
      {/* 标签栏 */}
      <div class="flex items-center shrink-0 relative">
        {/* 底部分割线 */}
        <div class="absolute bottom-0 left-0 right-0 h-px bg-border" />
        <div class="flex items-center overflow-x-auto no-scrollbar flex-1">
          <For each={local.tabs}>
            {(tab) => (
              <button
                class={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm border-b-2 transition-colors whitespace-nowrap select-none relative z-10",
                  local.value === tab.key
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  tab.disabled && "opacity-50 cursor-not-allowed",
                )}
                onClick={() => !tab.disabled && local.onChange(tab.key)}
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
              </button>
            )}
          </For>
        </div>
        <Show when={local.extra}>
          <div class="shrink-0 px-2">{local.extra}</div>
        </Show>
      </div>
      {/* 标签内容 */}
      <div class="flex-1 overflow-auto">
        {local.children(local.value)}
      </div>
    </div>
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
    <div class={cn("flex h-full", local.class)}>
      {/* 左侧菜单 */}
      <div class="w-44 shrink-0 border-r border-border">
        <For each={local.tabs}>
          {(tab) => (
            <button
              class={cn(
                "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors select-none",
                local.value === tab.key
                  ? "bg-accent-muted text-accent font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => local.onChange(tab.key)}
            >
              <Show when={tab.icon}>{tab.icon}</Show>
              <span>{tab.label}</span>
            </button>
          )}
        </For>
      </div>
      {/* 右侧内容 */}
      <div class="flex-1 overflow-auto p-4">
        {local.children(local.value)}
      </div>
    </div>
  )
}
