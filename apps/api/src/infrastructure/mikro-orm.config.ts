import type { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from '../config/load-env.js';
import { resolveDatabaseRuntime, resolvePostgresConfig, resolveSqliteDatabasePath } from './database-runtime.js';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmLotEntity,
  FilmFrameEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmJourneyEventEntity,
  FrameJourneyEventEntity,
  FilmDeviceEntity,
  DeviceMountEntity,
  FilmStateEntity,
  HolderTypeEntity,
  IdempotencyKeyEntity,
  CameraEntity,
  InterchangeableBackEntity,
  PackageTypeEntity,
  DeviceTypeEntity,
  RefreshTokenEntity,
  SlotStateEntity,
  StorageLocationEntity,
  UserEntity
} from './entities/index.js';

loadEnvFiles();

const entities = [
  UserEntity,
  IdempotencyKeyEntity,
  RefreshTokenEntity,
  FilmFormatEntity,
  DevelopmentProcessEntity,
  PackageTypeEntity,
  FilmStateEntity,
  StorageLocationEntity,
  SlotStateEntity,
  DeviceTypeEntity,
  HolderTypeEntity,
  EmulsionEntity,
  FilmEntity,
  FilmLotEntity,
  FilmFrameEntity,
  FilmJourneyEventEntity,
  FrameJourneyEventEntity,
  FilmDeviceEntity,
  DeviceMountEntity,
  CameraEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  InterchangeableBackEntity
];

const infrastructureDir = dirname(fileURLToPath(import.meta.url));
const runtime = resolveDatabaseRuntime();
const migrationsPath = resolve(
  infrastructureDir,
  runtime === 'postgres' ? 'migrations-postgres' : 'migrations'
);

const ormConfig: Partial<Options> = {
  metadataCache: { enabled: true, pretty: true },
  discovery: { tsConfigPath: './tsconfig.json' },
  migrations: {
    path: migrationsPath,
    glob: '!(*.d).{js,ts}'
  },
  entitiesTs: entities,
  entities,
  ...(runtime === 'postgres'
    ? {
        driver: PostgreSqlDriver,
        ...resolvePostgresConfig()
      }
    : {
        driver: SqliteDriver,
        dbName: resolveSqliteDatabasePath()
      })
};

export default ormConfig;
