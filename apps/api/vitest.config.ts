import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts', '**/*.e2e-spec.ts']
  },
  resolve: {
    alias: {
      '@frollz2/schema': fileURLToPath(new URL('../../packages/schema/src/index.ts', import.meta.url))
    }
  }
});