import { pathToFileURL } from 'node:url';
import { MikroORM } from '@mikro-orm/sqlite';
import ormConfig from './mikro-orm.config.js';

async function main(): Promise<void> {
  const orm = await MikroORM.init(ormConfig);
  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  void main();
}