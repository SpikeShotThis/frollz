import { defineConfig } from '@mikro-orm/sqlite';
import { loadEnvFiles } from '../config/load-env.js';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmStockEntity,
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

export default defineConfig({
  metadataCache: { enabled: true, pretty: true },
  // PostgreSQL stub: keep SQLite as bootstrap runtime for now.
  // Future work can switch on DATABASE_URL scheme and return a PostgreSQL config.
  discovery: { tsConfigPath: './tsconfig.json' },
  dbName: process.env['DATABASE_URL'] ?? 'frollz2.sqlite',
  migrations: {
    path: './src/infrastructure/migrations'
  },
  entitiesTs: [
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
    FilmStockEntity,
    FilmFrameEntity,
    FilmJourneyEventEntity,
    FrameJourneyEventEntity,
    FilmDeviceEntity,
    DeviceMountEntity,
    CameraEntity,
    FilmHolderEntity,
    FilmHolderSlotEntity,
    InterchangeableBackEntity
  ],
  entities: [
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
    FilmStockEntity,
    FilmFrameEntity,
    FilmJourneyEventEntity,
    FrameJourneyEventEntity,
    FilmDeviceEntity,
    DeviceMountEntity,
    CameraEntity,
    FilmHolderEntity,
    FilmHolderSlotEntity,
    InterchangeableBackEntity
  ]
});
