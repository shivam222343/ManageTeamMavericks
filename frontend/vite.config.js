import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/*.~tmp', '**/*.tmp', '**/public/event-assets/**', '**/public/backgrounds/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost/backend', // We can configure proxies to simplify request routing
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
