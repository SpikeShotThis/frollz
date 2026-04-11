import { Module } from '@nestjs/common';
import { KNEX_CONNECTION, KnexProvider } from './knex.provider';

@Module({
  providers: [KnexProvider],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule {}
