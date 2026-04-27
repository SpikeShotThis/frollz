import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, '../..');

const bddOutputDir = defineBddConfig({
  featuresRoot: 'e2e/features',
  features: '**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  outputDir: '.features-gen',
});

const API_URL = process.env['PLAYWRIGHT_API_URL'] ?? 'http://127.0.0.1:3001';
const BDD_BROWSER_CHANNEL = process.env['PLAYWRIGHT_BDD_CHANNEL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      // Test API — in-memory SQLite, auto-migrated and seeded on startup
      command: 'pnpm --filter @frollz2/api start:test',
      cwd: repoRoot,
      url: `${API_URL}/api/v1/auth/me`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // UI dev server proxied to the test API on port 3001
      command: `API_TARGET=${API_URL} pnpm dev --host 127.0.0.1 --port 4173`,
      cwd: configDir,
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'e2e',
      testMatch: '**/*.e2e.ts',
      use: { ...devices['Desktop Chrome'] }
    },
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
