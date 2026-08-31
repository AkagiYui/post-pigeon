import { Menu } from "@ark-ui/solid/menu"
import { batch, createEffect, createMemo, createSignal, createUniqueId, For, onCleanup, Show } from "solid-js"
import { Dynamic, Portal } from "solid-js/web"

import { ContextMenu, type MenuItem } from "@/components/ui/context-menu"
import { t } from "@/hooks/useI18n"
import { type EndpointType, type HTTPMethod, METHOD_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

import { canCloseSavedTab } from "./request-tab-actions"

export interface WorkspaceTab {
  id: string
  name: string
  path: string
  method: HTTPMethod
  type: EndpointType
  state: "preview" | "resident" | "pinned"
  dirty: boolean
  saved: boolean
}

export interface RequestWorkspaceTabsProps {
  tabs: WorkspaceTab[]
  value: string
  labelFor: (tab: WorkspaceTab) => string
  onChange: (id: string) => void
  onKeep: (id: string) => void
  onTogglePin: (id: string) => void
  onClose: (id: string) => void
  /** The owner must preserve pinned tabs and handle unsaved-change confirmation. */
  onCloseOthers: (id: string) => void
  /** The owner must preserve pinned tabs and handle unsaved-change confirmation. */
  onCloseAll: () => void
  /** Close saved, unchanged, unpinned tabs without discarding drafts. */
  onCloseSaved: () => void
  onMove: (fromId: string, toId: string) => void
  onNew: () => void
  onTitleClick?: (id: string) => void
  /** Panel ID: `${tabIdPrefix}-panel-${encodeURIComponent(tab.id)}`; tab ID uses `-tab-`. */
  tabIdPrefix?: string
}

/** A controlled toolbar only; the owner renders and retains request details. */
export function RequestWorkspaceTabs(props: RequestWorkspaceTabsProps) {
  const elements = new Map<string, HTMLButtonElement>()
  const slots = new Map<string, HTMLDivElement>()
  const rows = new Map<string, HTMLDivElement>()
  const animations = new Map<string, Animation>()
  const fallbackPrefix = `workspace-${createUniqueId()}`
  const prefix = () => props.tabIdPrefix ?? fallbackPrefix
  const primaryKey = /mac/i.test(navigator.platform) ? "⌘" : "Ctrl"
  const tabsById = createMemo(() => new Map(props.tabs.map(tab => [tab.id, tab])))
  const tabIds = createMemo(() => props.tabs.map(tab => tab.id))
  const [draggingId, setDraggingId] = createSignal<string>()
  const [dropTargetId, setDropTargetId] = createSignal<string>()
  let pointer: { id: string; pointerId: number; x: number; y: number } | undefined
  let suppressPointerClick = false
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // 只移动可见内容，命中区域保持原位，避免标签让位后反复触发相反方向的排序。
  const dragPreview = createMemo(() => {
    const from = props.tabs.findIndex(tab => tab.id === draggingId())
    const to = props.tabs.findIndex(tab => tab.id === dropTargetId())
    const offsets = new Map<string, number>()
    if (from < 0 || to < 0 || from === to || (props.tabs[from].state === "pinned") !== (props.tabs[to].state === "pinned")) return offsets
    const rects = new Map([...slots].map(([id, slot]) => [id, slot.getBoundingClientRect()]))
    const ids = props.tabs.map(tab => tab.id)
    const first = rects.get(ids[0])
    if (!first) return offsets
    const rtl = getComputedStyle(slots.get(ids[0])!).direction === "rtl"
    let left = rtl ? first.right : first.left
    ids.splice(to, 0, ids.splice(from, 1)[0])
    for (const id of ids) {
      const rect = rects.get(id)
      if (!rect) continue
      if (rtl) left -= rect.width
      offsets.set(id, left - rect.left)
      if (!rtl) left += rect.width
    }
    return offsets
  })

  // 松手或取消时从当前可见位置衔接；快速拖过多个标签也不会先闪回原位。
  const finishDrag = (move?: () => void) => {
    const previousPointer = pointer
    pointer = undefined
    document.removeEventListener("pointermove", movePointer)
    document.removeEventListener("pointerup", endPointer)
    document.removeEventListener("pointercancel", cancelPointer)
    document.removeEventListener("keydown", escapePointer)
    window.removeEventListener("blur", cancelGesture)
    const slot = previousPointer && slots.get(previousPointer.id)
    if (previousPointer && slot?.hasPointerCapture?.(previousPointer.pointerId)) slot.releasePointerCapture(previousPointer.pointerId)
    if (!draggingId()) return
    const before = new Map([...rows].map(([id, row]) => [id, { left: row.getBoundingClientRect().left, opacity: getComputedStyle(row).opacity }]))
    animations.forEach(animation => animation.cancel())
    animations.clear()
    rows.forEach(row => { row.style.transition = "none" })
    batch(() => { setDraggingId(undefined); setDropTargetId(undefined); move?.() })
    const after = new Map([...rows].map(([id, row]) => [id, row.getBoundingClientRect().left]))
    const shouldAnimate = !reducedMotion()
    for (const [id, row] of rows) {
      const previous = before.get(id)
      const offset = previous ? previous.left - after.get(id)! : 0
      if (previous && (Math.abs(offset) > 0.5 || Number(previous.opacity) < 1) && shouldAnimate && row.animate) {
        const animation = row.animate([
          { transform: `translateX(${offset}px)`, opacity: previous.opacity },
          { transform: "translateX(0px)", opacity: "1" },
        ], { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" })
        animations.set(id, animation)
        animation.onfinish = () => { if (animations.get(id) === animation) animations.delete(id) }
      }
      row.style.removeProperty("transition")
    }
  }

  createEffect(() => {
    const source = draggingId()
    if (source && !tabsById().has(source)) finishDrag()
  })

  const badge = (tab: WorkspaceTab) => {
    if (tab.type === "websocket") return "WS"
    if (tab.type === "doc") return t("workspaceTabs.document")
    // SSE currently uses HTTP in the shared model; also accept legacy runtime types.
    if (String(tab.type) === "sse" || tab.method.toUpperCase() === "SSE") return "SSE"
    return tab.method
  }
  const status = (tab: WorkspaceTab) => !tab.saved
    ? t("workspaceTabs.unsaved")
    : tab.dirty ? t("workspaceTabs.modified") : ""
  const title = (tab: WorkspaceTab) => [
    badge(tab), tab.name, tab.path, props.labelFor(tab),
    tab.state === "preview" ? t("workspaceTabs.preview") : "",
    tab.state === "pinned" ? t("workspaceTabs.pinned") : "",
    status(tab),
  ].filter((part, index, parts) => part && parts.indexOf(part) === index).join(" · ")
  const canBatchClose = (tab: WorkspaceTab) => tab.state !== "pinned"
  const canCloseOthers = (id: string) => props.tabs.some(tab => tab.id !== id && canBatchClose(tab))
  const batchItems = (id: string): MenuItem[] => [
    {
      key: "close-saved", label: t("workspaceTabs.closeSaved"),
      disabled: !props.tabs.some(canCloseSavedTab),
      onClick: () => { if (props.tabs.some(canCloseSavedTab)) props.onCloseSaved() },
    },
    {
      key: "close-others", label: t("workspaceTabs.closeOthers"),
      disabled: !id || !canCloseOthers(id),
      onClick: () => { if (id && canCloseOthers(id)) props.onCloseOthers(id) },
    },
    {
      key: "close-all", label: t("workspaceTabs.closeAll"),
      disabled: !props.tabs.some(canBatchClose),
      onClick: () => { if (props.tabs.some(canBatchClose)) props.onCloseAll() },
    },
  ]
  const contextItems = (tab: WorkspaceTab): MenuItem[] => [
    {
      key: "pin", label: tab.state === "pinned" ? t("workspaceTabs.unpin") : t("workspaceTabs.pin"),
      onClick: () => props.onTogglePin(tab.id),
    },
    { key: "separator", label: "", separator: true },
    { key: "close", label: t("workspaceTabs.close"), accelerator: `${primaryKey}+W`, onClick: () => props.onClose(tab.id) },
    ...batchItems(tab.id),
  ]
  const moreItems = (): MenuItem[] => [
    ...props.tabs.map(tab => ({
      key: `tab:${tab.id}`, label: title(tab),
      icon: <span aria-hidden="true">{props.value === tab.id ? "✓" : ""}</span>,
      onClick: () => { props.onChange(tab.id); reveal(tab.id) },
    })),
    { key: "separator", label: "", separator: true },
    ...batchItems(props.value),
  ]

  const reveal = (id: string) => elements.get(id)?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
  createEffect(() => {
    const id = props.value
    // Also reveal after tab insertion/reordering, even if the active ID stays the same.
    props.tabs.map(tab => tab.id)
    queueMicrotask(() => reveal(id))
  })
  onCleanup(() => {
    finishDrag()
    animations.forEach(animation => animation.cancel())
    animations.clear()
    elements.clear(); slots.clear(); rows.clear()
  })

  function navigate(event: KeyboardEvent, id: string) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const index = props.tabs.findIndex(tab => tab.id === id)
    const tablist = (event.currentTarget as HTMLElement).closest('[role="tablist"]')!
    const rtl = getComputedStyle(tablist).direction === "rtl"
    let next: number
    switch (event.key) {
      case "ArrowRight": next = (index + (rtl ? -1 : 1) + props.tabs.length) % props.tabs.length; break
      case "ArrowLeft": next = (index + (rtl ? 1 : -1) + props.tabs.length) % props.tabs.length; break
      case "Home": next = 0; break
      case "End": next = props.tabs.length - 1; break
      default: return
    }
    const target = props.tabs[next]
    if (!target) return
    event.preventDefault()
    props.onChange(target.id)
    elements.get(target.id)?.focus()
    reveal(target.id)
  }

  // 由稳定外层捕获指针，使用未变换的槽位命中检测；不依赖 WebView 原生 dragstart。
  function pointerTarget(event: PointerEvent, sourceId: string) {
    const source = tabsById().get(sourceId)
    const viewport = slots.get(sourceId)?.closest('[role="tablist"]')?.getBoundingClientRect()
    if (!source || !viewport || event.clientX < viewport.left || event.clientX >= viewport.right || event.clientY < viewport.top || event.clientY >= viewport.bottom) return
    for (const [id, slot] of slots) {
      const rect = slot.getBoundingClientRect()
      const target = tabsById().get(id)
      if (event.clientX >= rect.left && event.clientX < rect.right && target && id !== sourceId && canBatchClose(source) === canBatchClose(target)) return id
    }
  }
  function movePointer(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.pointerId) return
    if (!tabsById().has(pointer.id)) { finishDrag(); return }
    if (!draggingId()) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 5) return
      animations.forEach(animation => animation.cancel())
      animations.clear()
      slots.get(pointer.id)?.setPointerCapture?.(event.pointerId)
      suppressPointerClick = true
      setDraggingId(pointer.id)
    }
    event.preventDefault()
    setDropTargetId(pointerTarget(event, pointer.id))
  }
  function endPointer(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.pointerId) return
    const source = draggingId()
    const target = source && pointerTarget(event, source)
    finishDrag(source && target ? () => props.onMove(source, target) : undefined)
  }
  function cancelPointer(event: PointerEvent) {
    if (event.pointerId === pointer?.pointerId) finishDrag()
  }
  function cancelGesture() { finishDrag() }
  function escapePointer(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); finishDrag() }
  }
  function beginPointer(event: PointerEvent, id: string) {
    if (pointer || event.button !== 0 || event.isPrimary === false || event.ctrlKey || !(event.target instanceof Element) || !event.target.closest('[role="tab"]')) return
    suppressPointerClick = false
    pointer = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    document.addEventListener("pointermove", movePointer, { passive: false })
    document.addEventListener("pointerup", endPointer)
    document.addEventListener("pointercancel", cancelPointer)
    document.addEventListener("keydown", escapePointer)
    window.addEventListener("blur", cancelGesture)
  }

  return (
    <div class="flex h-11 min-h-11 max-h-11 w-full min-w-0 shrink-0 items-stretch border-b border-border bg-surface-alt text-foreground">
      <div role="tablist" aria-label={t("workspaceTabs.label")} aria-orientation="horizontal" class="flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden no-scrollbar">
        <For each={tabIds()}>
          {(id) => {
            // Keep the button keyed by ID while reading fresh immutable tab objects.
            const initialTab = tabsById().get(id)!
            const tab = () => tabsById().get(id) ?? initialTab
            let element: HTMLButtonElement | undefined
            let titleClickTimer: ReturnType<typeof setTimeout> | undefined
            const cancelTitleClick = () => {
              clearTimeout(titleClickTimer)
              titleClickTimer = undefined
            }
            const close = () => { cancelTitleClick(); props.onClose(id) }
            const titleClick = (event: MouseEvent) => {
              cancelTitleClick()
              if (suppressPointerClick && event.detail > 0) return
              // Read selection before this click bubbles to the tab's onChange.
              if (event.detail >= 2 || props.value !== id || !props.onTitleClick) return
              titleClickTimer = setTimeout(() => {
                titleClickTimer = undefined
                if (props.value === id) props.onTitleClick?.(id)
              }, 150)
            }
            createEffect(() => { if (props.value !== id) cancelTitleClick() })
            onCleanup(() => {
              cancelTitleClick()
              if (elements.get(id) === element) elements.delete(id)
              slots.delete(id); rows.delete(id)
              animations.get(id)?.cancel(); animations.delete(id)
            })
            return (
              <ContextMenu items={contextItems(tab())} class="flex min-w-0 shrink-0">
                <div
                  ref={node => slots.set(id, node)}
                  class={cn("relative h-full select-none touch-none", draggingId() && "cursor-grabbing")}
                  data-workspace-tab-slot={id}
                  onPointerDown={(event) => {
                    cancelTitleClick()
                    beginPointer(event, id)
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) return
                    event.preventDefault()
                    close()
                  }}
                >
                  <div
                    ref={node => rows.set(id, node)}
                    data-dragging={draggingId() === id ? "true" : undefined}
                    class={cn(
                      "group relative flex h-full min-w-[92px] max-w-[202px] items-center rounded-none border-r border-t-2 border-r-divider transition-[transform,opacity,background-color] duration-180 ease-out motion-reduce:transition-none",
                      props.value === id ? "border-t-accent bg-surface text-foreground" : "border-t-transparent bg-surface-alt text-muted-foreground hover:bg-hover",
                      draggingId() && "pointer-events-none",
                      draggingId() === id && "opacity-40",
                    )}
                    style={{ transform: `translateX(${dragPreview().get(id) ?? 0}px)` }}
                  >
                    <button
                      ref={(node) => { element = node; elements.set(id, node) }}
                      type="button"
                      role="tab"
                      id={`${prefix()}-tab-${encodeURIComponent(id)}`}
                      aria-controls={props.tabIdPrefix ? `${prefix()}-panel-${encodeURIComponent(id)}` : undefined}
                      aria-selected={props.value === id}
                      aria-label={props.labelFor(tab())}
                      tabindex={props.value === id || (!tabsById().has(props.value) && tabIds()[0] === id) ? 0 : -1}
                      title={title(tab())}
                      class="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onMouseDown={(event) => { if (event.button === 1) event.preventDefault() }}
                      onClick={(event) => {
                        if (suppressPointerClick && event.detail > 0) { event.preventDefault(); return }
                        props.onChange(id)
                      }}
                      onDblClick={() => { cancelTitleClick(); props.onKeep(id) }}
                      onKeyDown={event => navigate(event, id)}
                    >
                      <Dynamic component={tab().state === "preview" ? "em" : "span"} class={cn("flex min-w-0 flex-1 items-center gap-2", tab().state === "preview" && "italic")}>
                        <span class={cn("shrink-0 text-[10px] font-semibold", METHOD_COLORS[tab().method.toUpperCase()])}>{badge(tab())}</span>
                        <span class="min-w-0 truncate" onClick={titleClick}>{props.labelFor(tab())}</span>
                      </Dynamic>
                      <Show when={!tab().saved || tab().dirty}>
                        <span role="img" aria-label={status(tab())} title={status(tab())} class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      </Show>
                    </button>
                    <Show
                      when={tab().state === "pinned"}
                      fallback={(
                        <button
                          type="button"
                          aria-label={t("workspaceTabs.closeTab", { name: props.labelFor(tab()) })}
                          title={t("workspaceTabs.close")}
                          class="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-hover focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
                          onClick={close}
                        >
                          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6" /></svg>
                        </button>
                      )}
                    >
                      <button
                        type="button"
                        aria-label={t("workspaceTabs.unpinTab", { name: props.labelFor(tab()) })}
                        title={t("workspaceTabs.unpin")}
                        class="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => props.onTogglePin(id)}
                      >
                        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 9V3H8v6l-3 3v3h14v-3ZM12 15v7" /></svg>
                      </button>
                    </Show>
                  </div>
                  <Show when={dropTargetId() === id && dragPreview().size > 0}>
                    <div
                      aria-hidden="true"
                      data-drop-indicator="true"
                      class={cn("pointer-events-none absolute inset-y-1 z-10 w-0.5 rounded-full bg-accent", props.tabs.findIndex(tab => tab.id === draggingId()) < props.tabs.findIndex(tab => tab.id === id) ? "end-0" : "start-0")}
                    />
                  </Show>
                </div>
              </ContextMenu>
            )
          }}
        </For>
      </div>
      <button type="button" class="flex w-9 shrink-0 items-center justify-center hover:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={t("workspaceTabs.new")} title={t("workspaceTabs.new")} onClick={() => props.onNew()}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <Menu.Root
        positioning={{ placement: "bottom-end", gutter: 4 }}
        onSelect={({ value }) => {
          const item = moreItems().find(item => item.key === value)
          if (item && !item.disabled) item.onClick?.()
        }}
      >
        <Menu.Trigger
          class="flex w-9 shrink-0 items-center justify-center hover:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={t("workspaceTabs.more")}
          title={t("workspaceTabs.more")}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content aria-label={t("workspaceTabs.more")} class="anim-pop z-50 max-h-[80vh] min-w-45 max-w-[calc(100vw-16px)] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-xl outline-none">
              <For each={moreItems()}>
                {item => (
                  <Show when={!item.separator} fallback={<Menu.Separator class="my-1 border-t border-divider" />}>
                    <Menu.Item value={item.key} disabled={item.disabled} class="mx-1 flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-hover data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground">
                      <span class="w-4 shrink-0">{item.icon}</span>
                      <span class="min-w-0 break-words">{item.label}</span>
                    </Menu.Item>
                  </Show>
                )}
              </For>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </div>
  )
}
