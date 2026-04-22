import type { OnModuleInit } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config({ path: process.env['DOTENV_CONFIG_PATH'] || '.env' });
import { MikroOrmModule } from '@mikro-orm/nestjs';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MikroORM } from '@mikro-orm/core';
import ormConfig from './mikro-orm.config.js';
import { seedDatabase } from './seed.js';

@Global()
@Module({
  imports: [MikroOrmModule.forRoot(ormConfig)]
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) { }

  async onModuleInit() {
    if (process.env['AUTO_MIGRATE_SEED'] === 'true') {
      await this.orm.migrator.up();
      await seedDatabase(this.orm, { skipMigrations: true });

      console.log('[DatabaseModule] Migrations and seeds applied');
    }
  }
}
