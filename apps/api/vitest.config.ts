import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts', '**/*.e2e-spec.ts']
  },
  resolve: {
    alias: {
      '@frollz2/schema': fileURLToPath(new URL('../../packages/schema/dist/index.js', import.meta.url))
    }
  }
});
