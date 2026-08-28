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
  onMount(() => {
    // 只有原生窗口才谈得上全屏。server 模式（-tags server）下前端跑在普通浏览器里，
    // 原生 webview 注入的 window._wails.environment 不存在，System.IsMac() 恒为假——
    // 于是会走进下面的轮询分支，每 500ms 往 /wails/runtime 打一次 Window.IsFullscreen()
    // 去问一个根本不存在的窗口。这里直接不订阅，保持「非全屏」即可：
    // 浏览器里也没有原生标题栏需要留白。
    if (!System.IsDesktop()) return

    // 避免重复初始化
    if (initialized) return
    initialized = true

    // 清理必须在这里同步注册。onMount 的回调一旦 await，solid 的 owner 就丢了，
    // 之后再调 onCleanup 是空操作——监听器和定时器会永远解绑不掉。
    const disposers: Array<() => void> = []
    onCleanup(() => {
      for (const dispose of disposers) dispose()
      initialized = false
    })

    // 订阅先于首次读取建立，读取期间的状态变化不会漏掉；
    // 若读取返回时事件已经先到，则以事件为准，不用陈旧值覆盖。
    let eventArrived = false
    const applyFromEvent = (value: boolean) => {
      eventArrived = true
      setIsFullscreen(value)
    }

    if (System.IsMac()) {
      // macOS: 监听专用全屏事件
      disposers.push(Events.On("mac:WindowDidEnterFullScreen", () => applyFromEvent(true)))
      disposers.push(Events.On("mac:WindowDidExitFullScreen", () => applyFromEvent(false)))
    } else {
      // Windows/Linux: 使用轮询检测（Wails v3 可能也支持事件）
      const interval = setInterval(async () => {
        try {
          setIsFullscreen(await Window.IsFullscreen())
        } catch {
          // 轮询期间的偶发失败忽略即可，下一次心跳会自行恢复
        }
      }, 500)
      disposers.push(() => clearInterval(interval))
    }

    // 初始化时检查当前全屏状态。
    // 全屏状态只影响标题栏留白，拿不到就按「非全屏」渲染即可，
    // 但绝不能让它变成一条未捕获的 Promise 拒绝（那会在控制台里裸奔且无人处理）。
    void (async () => {
      try {
        const value = await Window.IsFullscreen()
        if (!eventArrived) setIsFullscreen(value)
      } catch (e) {
        console.warn("读取全屏状态失败，按非全屏处理", e)
        if (!eventArrived) setIsFullscreen(false)
      }
    })()
  })

  return isFullscreen
}
