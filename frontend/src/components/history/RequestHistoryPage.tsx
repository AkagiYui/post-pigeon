// 请求历史页面组件
import { Link, useParams } from "@tanstack/solid-router"
import { ArrowLeft, Clock, Trash2 } from "lucide-solid"
import { createEffect, createSignal, For, onMount, Show } from "solid-js"

import type { RequestHistory } from "@/../bindings/post-pigeon/internal/models"
import { RequestHistoryService } from "@/../bindings/post-pigeon/internal/services"
import { Button } from "@/components/ui/button"
import { SplitPane } from "@/components/ui/split-pane"
import { t } from "@/hooks/useI18n"
import { METHOD_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

import { HistoryDetail } from "./HistoryDetail"

const PAGE_SIZE = 50

/**
 * RequestHistoryPage 请求历史页面
 */
export function RequestHistoryPage() {
  const params = useParams({ from: "/project/$id/history" })
  const [historyList, setHistoryList] = createSignal<RequestHistory[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [hasMore, setHasMore] = createSignal(true)

  // 加载请求历史
  const loadHistory = async (reset = false) => {
    const projectId = params().id
    if (!projectId) return

    try {
      setLoading(true)
      const offset = reset ? 0 : historyList().length
      const list = await RequestHistoryService.ListHistoryByProject(projectId, PAGE_SIZE, offset)

      if (reset) {
        setHistoryList(list || [])
      } else {
        setHistoryList(prev => [...prev, ...(list || [])])
      }

      setHasMore((list || []).length === PAGE_SIZE)
    } catch (e) {
      console.error("加载请求历史失败", e)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  onMount(() => {
    loadHistory(true)
  })

  // 监听路由参数变化
  createEffect(() => {
    const projectId = params().id
    if (projectId) {
      loadHistory(true)
      setSelectedId(null)
    }
  })

  // 删除历史记录
  const handleDelete = async (id: string, e: Event) => {
    e.stopPropagation()
    try {
      await RequestHistoryService.DeleteHistory(id)
      setHistoryList(prev => prev.filter(item => item.id !== id))
      if (selectedId() === id) {
        setSelectedId(null)
      }
    } catch (err) {
      console.error("删除历史记录失败", err)
    }
  }

  // 格式化时间
  const formatTime = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t("history.justNow")
    if (minutes < 60) return t("history.minutesAgo", { count: minutes })
    if (hours < 24) return t("history.hoursAgo", { count: hours })
    if (days < 7) return t("history.daysAgo", { count: days })
    return d.toLocaleString()
  }

  // 格式化大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // 获取状态码颜色
  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-600"
    if (code >= 300 && code < 400) return "text-yellow-600"
    if (code >= 400 && code < 500) return "text-orange-600"
    if (code >= 500) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <div class="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div class="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <Link href="/project/$id" params={{ id: params().id }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft class="h-4 w-4 mr-1" />
            {t("history.back")}
          </Button>
        </Link>
        <div class="flex-1" />
        <Show when={historyList().length > 0}>
          <span class="text-sm text-muted-foreground">
            {t("history.total", { count: historyList().length })}
          </span>
        </Show>
      </div>

      {/* 主内容区 */}
      <div class="flex-1 overflow-hidden">
        <Show
          when={!loading() || historyList().length > 0}
          fallback={
            <div class="flex items-center justify-center h-full text-muted-foreground">
              {t("app.loading")}
            </div>
          }
        >
          <Show
            when={historyList().length > 0}
            fallback={
              <div class="flex items-center justify-center h-full text-muted-foreground">
                {t("history.empty")}
              </div>
            }
          >
            <SplitPane
              defaultSize={320}
              minSize={250}
              maxSize={450}
              left={
                <div class="flex flex-col h-full border-r border-border">
                  {/* 历史列表 */}
                  <div class="flex-1 overflow-auto">
                    <For each={historyList()}>
                      {(item) => (
                        <div
                          class={cn(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border/50 hover:bg-accent/50 transition-colors",
                            selectedId() === item.id && "bg-accent",
                          )}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {/* 方法标签 */}
                          <span
                            class={cn(
                              "text-xs font-medium px-1.5 py-0.5 rounded shrink-0",
                              METHOD_COLORS[item.method as keyof typeof METHOD_COLORS] || "bg-gray-100 text-gray-700",
                            )}
                          >
                            {item.method}
                          </span>

                          {/* URL 和时间 */}
                          <div class="flex-1 min-w-0">
                            <div class="text-sm truncate">{item.url}</div>
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                              <span class={getStatusCodeColor(item.statusCode)}>
                                {item.statusCode}
                              </span>
                              <span>{formatSize(item.size)}</span>
                              <span class="flex items-center gap-0.5">
                                <Clock class="h-3 w-3" />
                                {formatTime(item.createdAt as any)}
                              </span>
                            </div>
                          </div>

                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            class="opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => handleDelete(item.id, e)}
                          >
                            <Trash2 class="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      )}
                    </For>

                    {/* 加载更多 */}
                    <Show when={hasMore()}>
                      <div class="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadHistory(false)}
                          disabled={loading()}
                        >
                          {loading() ? t("app.loading") : t("history.loadMore")}
                        </Button>
                      </div>
                    </Show>
                  </div>
                </div>
              }
              right={
                <div class="h-full">
                  <Show
                    when={selectedId()}
                    fallback={
                      <div class="flex items-center justify-center h-full text-muted-foreground">
                        {t("history.selectToView")}
                      </div>
                    }
                  >
                    <HistoryDetail historyId={selectedId()!} />
                  </Show>
                </div>
              }
            />
          </Show>
        </Show>
      </div>
    </div>
  )
}
