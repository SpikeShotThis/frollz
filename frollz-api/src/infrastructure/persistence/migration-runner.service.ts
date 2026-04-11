import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Knex } from 'knex';
import { resolve } from 'path';
import { KNEX_CONNECTION } from './knex.provider';

// Resolve migrations dir relative to this file so it works regardless of CWD.
// Compiled path: dist/infrastructure/persistence/ → ../../../migrations
// Source path:   src/infrastructure/persistence/  → ../../../migrations
const MIGRATIONS_DIR = resolve(__dirname, '../../../migrations');

@Injectable()
export class MigrationRunnerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Running database migrations…');
    const [batch, migrations] = await this.knex.migrate.latest({
      directory: MIGRATIONS_DIR,
      loadExtensions: ['.ts', '.js'],
    });
    if (migrations.length === 0) {
      this.logger.log('No pending migrations.');
    } else {
      this.logger.log(`Batch ${batch} applied: ${migrations.join(', ')}`);
    }
  }
}
