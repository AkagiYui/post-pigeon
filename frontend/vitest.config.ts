import { fileURLToPath } from "node:url"

import solid from "vite-plugin-solid"
import { defineConfig } from "vitest/config"

// 单测配置独立于 vite.config.js：测试环境不需要 wails bindings 生成、tailwind、
// iconify 离线注册和 devtools 这些插件，只保留 solid 的 JSX 转换。
export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // solid 在测试中需要 development 条件，否则拿到的是 SSR 构建
    conditions: ["development", "browser"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/routeTree.gen.ts", "src/test/**"],
    },
  },
})
