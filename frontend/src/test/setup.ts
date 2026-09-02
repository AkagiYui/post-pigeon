// vitest 全局测试环境准备
import "@testing-library/jest-dom/vitest"

import { afterAll, vi } from "vitest"

// Node 25+ 的原生 Web Storage 全局变量会遮住 jsdom 的实现；测试应始终使用当前
// jsdom window 的隔离存储，不依赖 Node 的 --localstorage-file 或真实用户文件。
// Vitest 的 window 别名指向测试全局，必须从它暴露的 jsdom 实例取原始 window。
const testWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: testWindow.localStorage })
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: testWindow.sessionStorage })

// jsdom 未实现 matchMedia，主题相关代码依赖它
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// jsdom 未实现 ResizeObserver / IntersectionObserver，Ark UI 组件会用到
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver

// 有些依赖在导入后会留下自己的定时器，而 vitest 每个测试文件跑完就销毁 jsdom 环境，
// 这些定时器若在之后触发，就会抛 "window is not defined" / "document is not defined"
// —— 表现为一次随机出现、与断言无关的 unhandled error，把整轮测试判成失败：
// - @wailsio/runtime 被导入时就起了一个轮询 setInterval（drag.js 在等 Wails 环境就绪，
//   最多轮询 100 次）；
// - iconify-icon 拿到图标数据后用 setTimeout 延后回调，回调里才往 document 写 SVG。
//
// 这里把测试期间创建的定时器记下来，测试文件收尾时统一清掉。
const pendingIntervals = new Set<number>()
const pendingTimeouts = new Set<number>()
const nativeSetInterval = window.setInterval.bind(window)
const nativeSetTimeout = window.setTimeout.bind(window)
const nativeClearTimeout = window.clearTimeout.bind(window)
window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = nativeSetInterval(handler, timeout, ...args)
  pendingIntervals.add(id)
  return id
}) as typeof window.setInterval
window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = nativeSetTimeout(handler, timeout, ...args)
  pendingTimeouts.add(id)
  return id
}) as typeof window.setTimeout
window.clearTimeout = ((id?: number) => {
  if (id !== undefined) pendingTimeouts.delete(id)
  nativeClearTimeout(id)
}) as typeof window.clearTimeout

afterAll(() => {
  pendingIntervals.forEach(id => window.clearInterval(id))
  pendingIntervals.clear()
  pendingTimeouts.forEach(id => nativeClearTimeout(id))
  pendingTimeouts.clear()
})
