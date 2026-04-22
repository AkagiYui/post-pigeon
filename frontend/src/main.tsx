/* @refresh reload */
import { RouterProvider } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import { initI18n } from "@/hooks/useI18n"
import { initTheme } from "@/hooks/useTheme"
import { getRouter } from "@/router"

// 初始化主题和语言
Promise.all([initTheme(), initI18n()]).then(() => {
  const router = getRouter()
  const rootElement = document.getElementById("app")

  if (!rootElement) {
    throw new Error("App root element not found")
  }

  render(() => <RouterProvider router={router} />, rootElement)
})
