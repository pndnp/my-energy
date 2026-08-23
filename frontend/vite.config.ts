import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://backend-dev:3000',
        changeOrigin: false, // сохраняем Origin как http://localhost:5173
        secure: false,
        headers: {
          origin: 'http://localhost:5173' // явно передаём правильный Origin
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'manifest.json'],
      manifest: false,
      devOptions: {
        enabled: true,
        // В dev плагин отдаёт ESM-версию SW (импорты из /node_modules/.vite/deps),
        // поэтому нужен type: "module" (classic падает с SyntaxError: Cannot use
        // import statement outside a module). Без явного type вообще плагин
        // подставляет строку "undefined" в navigator.serviceWorker.register → TypeError.
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  publicDir: 'public',
})
