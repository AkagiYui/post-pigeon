import { lazy, Suspense } from 'solid-js'
import { Show } from 'solid-js/web'

// 仅在开发模式加载路由调试工具，避免影响生产构建体积。
const TanStackRouterDevtools = lazy(async () => {
  const mod = await import('@tanstack/solid-router-devtools')
  return { default: mod.TanStackRouterDevtools }
})



export function Devtools() {
  return (
    <Show when={import.meta.env.DEV}>
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </Show>
  )
} 