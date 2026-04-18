import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path'


export default defineConfig({
  plugins: [vue(), vueDevTools()],
  optimizeDeps: {
    include: ['@frollz/shared'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
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
        target: 'http://localhost:3000/',
        changeOrigin: true,
      },
    },
  },
});