import { Provider } from '@nestjs/common';
import Knex from 'knex';
import { resolve } from 'path';

export const KNEX_CONNECTION = Symbol('KNEX_CONNECTION');

export const KnexProvider: Provider = {
  provide: KNEX_CONNECTION,
  useFactory: () => {
    const env = process.env.NODE_ENV;

    if (env === 'test') {
      return Knex({
        client: 'better-sqlite3',
        connection: ':memory:',
        useNullAsDefault: true,
      });
    }

    if (env === 'development') {
      return Knex({
        client: 'better-sqlite3',
        connection: { filename: resolve(process.cwd(), 'dev.db') },
        useNullAsDefault: true,
      });
    }

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
