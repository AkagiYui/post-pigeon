import "@fontsource-variable/outfit"
// 该包 exports 只暴露 index.css（全 8 字重），用相对文件路径绕过 exports，只引 Regular/Medium/Bold 三个字重
import "../../node_modules/harmonyos-sans-sc-webfont-splitted/dist/Regular.css"
import "../../node_modules/harmonyos-sans-sc-webfont-splitted/dist/Medium.css"
import "../../node_modules/harmonyos-sans-sc-webfont-splitted/dist/Bold.css"
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
