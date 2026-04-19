import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['@frollz/shared'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // Proxy /api to the API service — allows the UI dev server to reach the
      // API without CORS issues. API_PROXY_TARGET is set by the test harness or
      // docker-compose.dev.yml; falls back to localhost for running outside Docker.
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000/',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000/',
        changeOrigin: true,
      },
    },
  },
});