import { Outlet, createRootRoute } from '@tanstack/solid-router'

import '@/styles.css'
import { Devtools } from '@/components/Devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return <>
    <Outlet />
    <Devtools />
  </>
}