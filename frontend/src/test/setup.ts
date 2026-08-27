// vitest 全局测试环境准备
import "@testing-library/jest-dom/vitest"

import { afterAll, vi } from "vitest"

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

// @wailsio/runtime 在被导入时就起了一个轮询 setInterval（drag.js 在等 Wails 环境就绪，
// 最多轮询 100 次）。而 vitest 每个测试文件跑完就销毁 jsdom 环境，这个 interval 若在
// 之后触发，就会抛 "window is not defined" —— 表现为一次随机出现、与断言无关的
// unhandled error，把整轮测试判成失败。
//
// 这里把测试期间创建的 interval 记下来，测试文件收尾时统一清掉。
const pendingIntervals = new Set<number>()
const nativeSetInterval = window.setInterval.bind(window)
window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = nativeSetInterval(handler, timeout, ...args)
  pendingIntervals.add(id)
  return id
}) as typeof window.setInterval

afterAll(() => {
  pendingIntervals.forEach(id => window.clearInterval(id))
  pendingIntervals.clear()
})
