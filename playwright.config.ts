import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  webServer: {
    command: 'NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @frollz/frollz-ui build && pnpm --filter @frollz/frollz-ui preview',
    port: 5173,
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
    env: {
      API_PROXY_TARGET: 'http://127.0.0.1:3000/',
    },
  },
};

export default config;
