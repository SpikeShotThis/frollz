import type { OnModuleInit } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env['DOTENV_CONFIG_PATH'] || '.env' });
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { MikroORM } from '@mikro-orm/core';
import ormConfig from './mikro-orm.config.js';
import { seedDatabase } from './seed.js';
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


@Global()
@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      useFactory: () => ({
        autoLoadEntities: true,
        driver: SqliteDriver,
        dbName: process.env['DATABASE_URL'] ?? 'frollz2.sqlite',
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
        ],
        debug: false
      })
    })
  ]
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    if (process.env['AUTO_MIGRATE_SEED'] === 'true') {
      // Run migrations and seeds on startup
      const orm = await MikroORM.init(ormConfig);
      try {
        await orm.migrator.up();
        await seedDatabase(orm);
      } finally {
        await orm.close(true);
      }
       
      console.log('[DatabaseModule] Migrations and seeds applied');
    }
  }
}
