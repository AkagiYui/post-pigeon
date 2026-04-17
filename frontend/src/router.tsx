import { createRouter as createTanStackRouter, createHashHistory } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

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

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}