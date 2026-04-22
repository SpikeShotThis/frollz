import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(() => {
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  const plugins = [vue(), ...(isDevelopment ? [vueDevTools()] : [])];

  return {
    plugins,
    resolve: {
      alias: {
        '@frollz2/schema': fileURLToPath(new URL('../../packages/schema/dist/index.js', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  };
});
