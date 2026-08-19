// 全屏状态监听 Hook
import { Events, System, Window } from "@wailsio/runtime"
import { createSignal, onCleanup, onMount } from "solid-js"

/** 全屏状态信号 */
const [isFullscreen, setIsFullscreen] = createSignal(false)

/** 是否已初始化 */
let initialized = false

/**
 * 监听窗口全屏状态
 * macOS 使用专用事件，Windows/Linux 使用轮询
 *
 * @returns 全屏状态信号
 *
 * @example
 * ```tsx
 * const fullscreen = useFullscreen()
 *
 * <Show when={!fullscreen()}>
 *   <div>非全屏时显示</div>
 * </Show>
 * ```
 */
export function useFullscreen() {
  onMount(async () => {
    // 避免重复初始化
    if (initialized) return
    initialized = true

    // 初始化时检查当前全屏状态。
    // 全屏状态只影响标题栏留白，拿不到就按「非全屏」渲染即可，
    // 但绝不能让它变成一条未捕获的 Promise 拒绝（那会在控制台里裸奔且无人处理）。
    try {
      setIsFullscreen(await Window.IsFullscreen())
    } catch (e) {
      console.warn("读取全屏状态失败，按非全屏处理", e)
      setIsFullscreen(false)
    }

    if (System.IsMac()) {
      // macOS: 监听专用全屏事件
      const enterUnsub = Events.On("mac:WindowDidEnterFullScreen", () => {
        setIsFullscreen(true)
      })

      const exitUnsub = Events.On("mac:WindowDidExitFullScreen", () => {
        setIsFullscreen(false)
      })

      // 组件卸载时清理监听器
      onCleanup(() => {
        enterUnsub()
        exitUnsub()
        initialized = false
      })
    } else {
      // Windows/Linux: 使用轮询检测（Wails v3 可能也支持事件）
      const interval = setInterval(async () => {
        try {
          setIsFullscreen(await Window.IsFullscreen())
        } catch {
          // 轮询期间的偶发失败忽略即可，下一次心跳会自行恢复
        }
      }, 500)

      onCleanup(() => {
        clearInterval(interval)
        initialized = false
      })
    }
  })

  return isFullscreen
}
