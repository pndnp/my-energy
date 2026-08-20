import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  publicDir: 'public',
})
