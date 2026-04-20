import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import wails from '@wailsio/runtime/plugins/vite'
import devtools from 'solid-devtools/vite'
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'solid', autoCodeSplitting: true }),
    devtools({
      autoname: true,
    }),
    solid(),
    wails('./bindings'),
  ],
})
