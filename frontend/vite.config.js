import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import wails from "@wailsio/runtime/plugins/vite"
import devtools from "solid-devtools/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  // 监听 IPv6 通配地址（Node 下为双栈），使 Wails 的 Go 资源代理无论走
  // [::1] 还是 127.0.0.1 都能连上 vite，避免 "dial tcp [::1]:9245: operation timed out"。
  server: {
    host: "::",
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: "solid", autoCodeSplitting: true }),
    devtools({
      autoname: true,
    }),
    solid(),
    wails("./bindings"),
  ],
})
