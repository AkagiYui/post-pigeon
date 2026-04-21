import { Outlet, createRootRoute } from '@tanstack/solid-router'
import '@/styles.css'
import { AppLayout } from '@/components/layout/AppLayout'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}