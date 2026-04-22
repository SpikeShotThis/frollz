import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

function findNearestDirWithPackageJson(startDir: string): string | null {
  let currentDir = resolve(startDir);

  while (true) {
    if (existsSync(resolve(currentDir, 'package.json'))) {
      return currentDir;
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function apiRootDir(): string {
  const fromModulePath = fileURLToPath(import.meta.url);
  const fromModuleDir = resolve(fromModulePath, '..');
  const packageRootFromModule = findNearestDirWithPackageJson(fromModuleDir);

  if (packageRootFromModule) {
    return packageRootFromModule;
  }

  const packageRootFromCwd = findNearestDirWithPackageJson(process.cwd());
  if (packageRootFromCwd) {
    return packageRootFromCwd;
  }

  return process.cwd();
}

function monorepoRootDir(): string {
  let currentDir = apiRootDir();

  while (true) {
    if (existsSync(resolve(currentDir, 'pnpm-workspace.yaml')) || existsSync(resolve(currentDir, '.git'))) {
      return currentDir;
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      return currentDir;
    }

    currentDir = parentDir;
  }
}

export function resolveEnvFilePaths(): string[] {
  const nodeEnv = process.env['NODE_ENV'];
  const apiRoot = apiRootDir();
  const repoRoot = monorepoRootDir();

  const candidates = [
    nodeEnv ? resolve(apiRoot, `.env.${nodeEnv}.local`) : undefined,
    nodeEnv ? resolve(apiRoot, `.env.${nodeEnv}`) : undefined,
    resolve(apiRoot, '.env.local'),
    resolve(apiRoot, '.env'),
    nodeEnv ? resolve(repoRoot, `.env.${nodeEnv}.local`) : undefined,
    nodeEnv ? resolve(repoRoot, `.env.${nodeEnv}`) : undefined,
    resolve(repoRoot, '.env.local'),
    resolve(repoRoot, '.env')
  ].filter((path): path is string => Boolean(path));

  return [...new Set(candidates)];
}

export function loadEnvFiles(): string[] {
  const overridePath = process.env['DOTENV_CONFIG_PATH'];

  if (overridePath) {
    config({ path: overridePath, override: false, quiet: true });
    return [overridePath];
  }

  const loadedPaths: string[] = [];
  for (const envPath of resolveEnvFilePaths()) {
    if (!existsSync(envPath)) {
      continue;
    }

    config({ path: envPath, override: false, quiet: true });
    loadedPaths.push(envPath);
  }

  return loadedPaths;
}
