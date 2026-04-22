import { Outlet, createRootRoute } from '@tanstack/solid-router'
import '@/styles.css'
import { AppLayout } from '@/components/layout/AppLayout'
import { Devtools } from '@/components/Devtools'

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