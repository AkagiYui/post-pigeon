/* @refresh reload */
import { RouterProvider } from "@tanstack/solid-router"
import { render } from "solid-js/web"

import { initI18n } from "@/hooks/useI18n"
import { initScaleShortcuts, initTheme } from "@/hooks/useTheme"
import { getRouter } from "@/router"

// 初始化主题和语言
Promise.all([initTheme(), initI18n()]).then(() => {
  // 初始化缩放快捷键
  initScaleShortcuts()

  const router = getRouter()
  const rootElement = document.getElementById("app")

  if (!rootElement) {
    throw new Error("App root element not found")
  }

  render(() => <RouterProvider router={router} />, rootElement)
})
