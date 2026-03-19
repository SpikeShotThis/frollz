/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy /api to the API service — allows the UI dev server to reach the
      // API without CORS issues. API_PROXY_TARGET is set by docker-compose.dev.yml;
      // falls back to localhost for running outside Docker.
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  envPrefix: 'VITE_',
  test: {
    environment: 'node',
    globals: true,
  },
})