import { defineConfig } from '@mikro-orm/sqlite';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmEntity,
  FilmFormatEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmJourneyEventEntity,
  FilmReceiverEntity,
  FilmStateEntity,
  HolderTypeEntity,
  IdempotencyKeyEntity,
  InterchangeableBackEntity,
  PackageTypeEntity,
  ReceiverTypeEntity,
  RefreshTokenEntity,
  SlotStateEntity,
  StorageLocationEntity,
  UserEntity
} from './entities/index.js';

export default defineConfig({
  metadataProvider: TsMorphMetadataProvider,
  metadataCache: { enabled: true, pretty: true },
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
    ReceiverTypeEntity,
    HolderTypeEntity,
    EmulsionEntity,
    FilmEntity,
    FilmJourneyEventEntity,
    FilmReceiverEntity,
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
    ReceiverTypeEntity,
    HolderTypeEntity,
    EmulsionEntity,
    FilmEntity,
    FilmJourneyEventEntity,
    FilmReceiverEntity,
    FilmHolderEntity,
    FilmHolderSlotEntity,
    InterchangeableBackEntity
  ]
});
