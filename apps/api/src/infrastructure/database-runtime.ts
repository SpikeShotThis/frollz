import type { Dictionary, MikroORM } from '@mikro-orm/core';

export type DatabaseRuntime = 'postgres' | 'sqlite';

function normalizeValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isPostgresUrl(value: string | undefined): boolean {
  const normalized = normalizeValue(value);
  return normalized.startsWith('postgres://') || normalized.startsWith('postgresql://');
}

export function resolveDatabaseRuntime(env: NodeJS.ProcessEnv = process.env): DatabaseRuntime {
  const explicitRuntime = normalizeValue(env['DATABASE_DRIVER']);

  if (explicitRuntime === 'postgres' || explicitRuntime === 'postgresql') {
    return 'postgres';
  }

  if (explicitRuntime === 'sqlite') {
    return 'sqlite';
  }

  const databaseUrl = env['DATABASE_URL'];

  if (isPostgresUrl(databaseUrl)) {
    return 'postgres';
  }

  if (databaseUrl) {
    return 'sqlite';
  }

  if (env['DATABASE_HOST']) {
    return 'postgres';
  }

  return 'sqlite';
}

export async function applyDatabaseMigrations(orm: MikroORM): Promise<void> {
  await orm.migrator.up();
}

export function resolvePostgresConfig(env: NodeJS.ProcessEnv = process.env): Dictionary {
  const databaseUrl = env['DATABASE_URL'];

  if (isPostgresUrl(databaseUrl)) {
    return { clientUrl: databaseUrl };
  }

  const parsedPort = Number.parseInt(env['DATABASE_PORT'] ?? '5432', 10);

  return {
    host: env['DATABASE_HOST'] ?? 'postgres',
    port: Number.isNaN(parsedPort) ? 5432 : parsedPort,
    dbName: env['DATABASE_NAME'] ?? 'frollz',
    user: env['DATABASE_USER'] ?? 'frollz',
    password: env['DATABASE_PASSWORD'] ?? 'changeme'
  };
}

export function resolveSqliteDatabasePath(env: NodeJS.ProcessEnv = process.env): string {
  const value = env['DATABASE_URL']?.trim();
  return value && value.length > 0 ? value : 'frollz2.sqlite';
}
