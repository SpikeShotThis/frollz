import { FullConfig } from '@playwright/test';
import { spawn, spawnSync } from 'child_process';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

const STATE_PATH = resolve(process.cwd(), 'e2e', '.api-server.pid');
const API_PORT = process.env.API_PORT ?? '3000';
const API_URL = `http://127.0.0.1:${API_PORT}`;
const HEALTH_CHECK_PATH = '/api/transitions/profiles';
const START_TIMEOUT = 120_000;
const POLL_INTERVAL = 1000;

function getPidListeningOnPort(port: string): number | null {
  const result = spawnSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN', '-Pn'], {
    encoding: 'utf-8',
  });
  if (result.status !== 0 || !result.stdout) return null;
  const line = result.stdout.split('\n').find((row) => row.trim().length > 0);
  if (!line) return null;
  const parts = line.trim().split(/\s+/);
  const pid = Number(parts[1]);
  return Number.isInteger(pid) ? pid : null;
}

function getCommandForPid(pid: number): string | null {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf-8',
  });
  if (result.status !== 0 || !result.stdout) return null;
  return result.stdout.trim();
}

function shouldTerminateExistingApi(command: string | null): boolean {
  if (!command) return false;
  return [
    '@frollz/frollz-api',
    'nest start',
    'dist/main',
    'frollz-api',
  ].some((fragment) => command.includes(fragment));
}

async function waitForApi() {
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_URL}${HEALTH_CHECK_PATH}`);
      if (response.ok) {
        return true;
      }
    } catch {
      // ignore until available
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  return false;
}

export default async function globalSetup(config: FullConfig) {
  const existingPid = getPidListeningOnPort(API_PORT);
  if (existingPid) {
    const command = getCommandForPid(existingPid);
    if (shouldTerminateExistingApi(command)) {
      process.kill(existingPid, 'SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      const healthy = await waitForApi();
      if (healthy) {
        console.log(`API already available at ${API_URL}, skipping server startup.`);
        return;
      }
    }
  }

  const apiProcess = spawn('pnpm', ['--filter', '@frollz/frollz-api', 'start'], {
    cwd: config.rootDir,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NODE_ENV: 'development',
      PORT: API_PORT,
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  await writeFile(STATE_PATH, String(apiProcess.pid), 'utf-8');
  const started = await waitForApi();
  if (!started) {
    throw new Error(`Timed out waiting for API at ${API_URL}${HEALTH_CHECK_PATH}`);
  }
}
