import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import wails from "@wailsio/runtime/plugins/vite"
import devtools from "solid-devtools/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
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
