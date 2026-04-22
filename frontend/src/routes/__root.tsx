import "@/styles.css"

import { createRootRoute, Outlet } from "@tanstack/solid-router"

import { Devtools } from "@/components/Devtools"
import { AppLayout } from "@/components/layout/AppLayout"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AppLayout>
      <Outlet />
      <Devtools />
    </AppLayout>
  )
}
