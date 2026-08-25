import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { DevTools } from "@vitejs/devtools"
import wails from "@wailsio/runtime/plugins/vite"
import devtools from "solid-devtools/vite"
import { defineConfig } from "vite"
import { devtoolsPack } from "vite-plugin-devtools-pack"
import { solidDevtoolsPanel, tanstackRouterPanel } from "vite-plugin-devtools-pack/solid"
import iconifyOffline from "vite-plugin-iconify-offline"
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
    // 扫描源码中的 lucide:* 图标引用，从本地 @iconify-json/lucide 预注册到 Iconify 运行时，
    // 使图标完全离线，运行时不再向 Iconify API 发起网络请求。
    // exclude 排除会被误当成 `prefix:name` 图标的源码片段：Tailwind 响应式变体 max-sm、
    // WebSocket/SSE 事件标识 ws/sse、以及 Wails 拖拽区 CSS 变量 --wails-draggable。
    iconifyOffline({ exclude: ["max-sm", "ws", "sse", "--wails-draggable"] }),
    wails("./bindings"),
    // 把 TanStack Router 与 Solid 的调试面板收进 Vite DevTools 的 dock，
    // 页面上不再有各自的悬浮入口
    devtoolsPack([tanstackRouterPanel(), solidDevtoolsPanel()]),
    DevTools({ visibility: "passive" }),
  ],
})
