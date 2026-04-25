import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MikroORM } from '@mikro-orm/sqlite';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import config from '../mikro-orm.config.js';
import { DomainErrorFilter } from '../src/common/filters/domain-error.filter.js';
import { seedDatabase } from '../src/infrastructure/seed.js';

export type TestHarness = {
  app: NestFastifyApplication;
  orm: MikroORM;
  dbDirectory: string;
};

export async function createTestHarness(): Promise<TestHarness> {
  const dbDirectory = mkdtempSync(join(tmpdir(), 'frollz2-api-'));
  const dbPath = join(dbDirectory, 'test.sqlite');
  process.env['DATABASE_URL'] = dbPath;
  process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret';
  process.env['AUTH_REFRESH_REPLAY_GRACE_SECONDS'] ??= '1';
  process.env['NODE_ENV'] = 'test';

  const { AppModule } = await import('../src/app.module.js');

  const orm = await MikroORM.init({ ...config, dbName: dbPath });
  await seedDatabase(orm);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new DomainErrorFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, orm, dbDirectory };
}

export async function destroyTestHarness(harness: TestHarness): Promise<void> {
  await harness.app.close();
  await harness.orm.close(true);
  rmSync(harness.dbDirectory, { recursive: true, force: true });
}
