import type { OnModuleInit } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MikroORM } from '@mikro-orm/core';
import ormConfig from './mikro-orm.config.js';
import { applyDatabaseMigrations, resolveDatabaseRuntime, resolveSqliteDatabasePath } from './database-runtime.js';
import { seedDatabase } from './seed.js';

@Global()
@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      useFactory: () => {
        if (resolveDatabaseRuntime() !== 'postgres') {
          return { ...ormConfig, dbName: resolveSqliteDatabasePath() };
        }
        return { ...ormConfig };
      }
    })
  ]
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) { }

  async onModuleInit() {
    if (process.env['AUTO_MIGRATE_SEED'] === 'true') {
      await applyDatabaseMigrations(this.orm);
      await seedDatabase(this.orm, { skipMigrations: true });

      console.log('[DatabaseModule] Migrations and seeds applied');
    }
  }
}
