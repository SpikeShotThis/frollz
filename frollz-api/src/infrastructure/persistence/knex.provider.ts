import { Provider } from '@nestjs/common';
import Knex from 'knex';

export const KNEX_CONNECTION = Symbol('KNEX_CONNECTION');

export const KnexProvider: Provider = {
  provide: KNEX_CONNECTION,
  useFactory: () => {
    return Knex({
      client: 'pg',
      connection: {
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: parseInt(process.env.DATABASE_PORT ?? '5432'),
        database: process.env.DATABASE_NAME ?? 'frollz',
        user: process.env.DATABASE_USER ?? 'joshholl',
        password: process.env.DATABASE_PASSWORD ?? '',
      },
      pool: { min: 2, max: 10 },
    });
  },
};
