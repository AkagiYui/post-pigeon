import { createRouter as createTanStackRouter, createHashHistory } from '@tanstack/solid-router'

import { routeTree } from '@/routeTree.gen'

// 在客户端webview中，使用 hash 模式路由
const hashHistory = createHashHistory()

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    history: hashHistory,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })
}

declare module '@tanstack/solid-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}