import { defineConfig, devices } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4173',
    cwd: configDir,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
