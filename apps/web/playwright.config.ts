import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { resolve } from 'node:path';

const configDir = __dirname;
const repoRoot = resolve(__dirname, '../..');

const bddOutputDir = defineBddConfig({
  featuresRoot: 'e2e/features',
  features: '**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  outputDir: '.features-gen',
});

const API_URL = process.env['PLAYWRIGHT_API_URL'] ?? 'http://127.0.0.1:3001';
const WEB_PORT = 4174;
const BDD_BROWSER_CHANNEL = process.env['PLAYWRIGHT_BDD_CHANNEL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: 'pnpm --filter @frollz2/api start:test',
      cwd: repoRoot,
      url: `${API_URL}/api/v1/auth/me`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `API_URL=${API_URL} pnpm exec next dev -p ${WEB_PORT} -H 127.0.0.1`,
      cwd: configDir,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'bdd',
      testDir: bddOutputDir,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        ...(BDD_BROWSER_CHANNEL ? { channel: BDD_BROWSER_CHANNEL } : {}),
      }
    }
  ]
});
