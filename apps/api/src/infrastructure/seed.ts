import type { EntityClass, EntityManager } from '@mikro-orm/core';
import { MikroORM } from '@mikro-orm/core';
import bcrypt from 'bcrypt';
import { pathToFileURL } from 'node:url';
import ormConfig from './mikro-orm.config.js';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmFormatEntity,
  FilmStateEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  DeviceTypeEntity,
  SlotStateEntity,
  StorageLocationEntity,
  UserEntity
} from './entities/index.js';

const filmFormats = [
  { code: '35mm', label: '35mm' },
  { code: '120', label: '120' },
  { code: '4x5', label: '4x5' },
  { code: '5x7', label: '5x7' },
  { code: '2x3', label: '2x3' },
  { code: '8x10', label: '8x10' },
  { code: '11x14', label: '11x14' },
  { code: 'InstaxMini', label: 'Instax Mini' },
  { code: 'InstaxWide', label: 'Instax Wide' },
  { code: 'InstaxSquare', label: 'Instax Square' }
];

const developmentProcesses = [
  { code: 'C41', label: 'C-41 (Colour Negative)' },
  { code: 'E6', label: 'E-6 (Slide/Reversal)' },
  { code: 'ECN2', label: 'ECN-2 (Motion Picture)' },
  { code: 'BW', label: 'Black & White' },
  { code: 'BWReversal', label: 'Black & White Reversal' },
  { code: 'Instant', label: 'Instant' }
];

const filmStates = [
  { code: 'purchased', label: 'Purchased' },
  { code: 'stored', label: 'Stored' },
  { code: 'loaded', label: 'Loaded' },
  { code: 'exposed', label: 'Exposed' },
  { code: 'removed', label: 'Removed' },
  { code: 'sent_for_dev', label: 'Sent for development' },
  { code: 'developed', label: 'Developed' },
  { code: 'scanned', label: 'Scanned' },
  { code: 'archived', label: 'Archived' }
];

const storageLocations = [
  { code: 'freezer', label: 'Freezer' },
  { code: 'refrigerator', label: 'Refrigerator' },
  { code: 'shelf', label: 'Shelf' },
  { code: 'other', label: 'Other' }
];

const slotStates = [
  { code: 'empty', label: 'Empty' },
  { code: 'loaded', label: 'Loaded' },
  { code: 'exposed', label: 'Exposed' },
  { code: 'removed', label: 'Removed' }
];

const deviceTypes = [
  { code: 'camera', label: 'Camera' },
  { code: 'interchangeable_back', label: 'Interchangeable back' },
  { code: 'film_holder', label: 'Film holder' }
];

const holderTypes = [
  { code: 'standard', label: 'Standard' },
  { code: 'grafmatic', label: 'Grafmatic' },
  { code: 'readyload', label: 'Readyload' },
  { code: 'quickload', label: 'Quickload' }
];

const packageTypes = [
  { code: '24exp', label: '24 exposures', filmFormatCode: '35mm' },
  { code: '36exp', label: '36 exposures', filmFormatCode: '35mm' },
  { code: '100ft_bulk', label: '100ft spool', filmFormatCode: '35mm' },
  { code: '400ft_bulk', label: '400ft spool', filmFormatCode: '35mm' },
  { code: '120_roll', label: '120 roll', filmFormatCode: '120' },
  { code: '220_roll', label: '220 roll', filmFormatCode: '120' },
  { code: '10sheets', label: '10 sheets', filmFormatCode: '4x5' },
  { code: '25sheets', label: '25 sheets', filmFormatCode: '4x5' },
  { code: '50sheets', label: '50 sheets', filmFormatCode: '4x5' },
  { code: '10sheets', label: '10 sheets', filmFormatCode: '5x7' },
  { code: '25sheets', label: '25 sheets', filmFormatCode: '5x7' },
  { code: '50sheets', label: '50 sheets', filmFormatCode: '5x7' },
  { code: '10sheets', label: '10 sheets', filmFormatCode: '2x3' },
  { code: '25sheets', label: '25 sheets', filmFormatCode: '2x3' },
  { code: '50sheets', label: '50 sheets', filmFormatCode: '2x3' },
  { code: '10sheets', label: '10 sheets', filmFormatCode: '8x10' },
  { code: '25sheets', label: '25 sheets', filmFormatCode: '8x10' },
  { code: '50sheets', label: '50 sheets', filmFormatCode: '8x10' },
  { code: '10sheets', label: '10 sheets', filmFormatCode: '11x14' },
  { code: '25sheets', label: '25 sheets', filmFormatCode: '11x14' },
  { code: '50sheets', label: '50 sheets', filmFormatCode: '11x14' },
  { code: 'pack', label: 'Pack', filmFormatCode: 'InstaxMini' },
  { code: 'pack', label: 'Pack', filmFormatCode: 'InstaxWide' },
  { code: 'pack', label: 'Pack', filmFormatCode: 'InstaxSquare' }
];

const emulsions = [
  { brand: 'Gold', manufacturer: 'Kodak', isoSpeed: 200, developmentProcessCode: 'C41', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Portra', manufacturer: 'Kodak', isoSpeed: 400, developmentProcessCode: 'C41', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Ektar', manufacturer: 'Kodak', isoSpeed: 100, developmentProcessCode: 'C41', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Tri-X', manufacturer: 'Kodak', isoSpeed: 400, developmentProcessCode: 'BW', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'HP5 Plus', manufacturer: 'Ilford', isoSpeed: 400, developmentProcessCode: 'BW', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Delta', manufacturer: 'Ilford', isoSpeed: 100, developmentProcessCode: 'BW', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Velvia', manufacturer: 'Fujifilm', isoSpeed: 50, developmentProcessCode: 'E6', balance: 'daylight', filmFormatCodes: ['35mm', '120', '4x5'] },
  { brand: 'Provia', manufacturer: 'Fujifilm', isoSpeed: 100, developmentProcessCode: 'E6', balance: 'daylight', filmFormatCodes: ['35mm', '120'] },
  { brand: '800T', manufacturer: 'CineStill', isoSpeed: 800, developmentProcessCode: 'ECN2', balance: 'tungsten', filmFormatCodes: ['35mm', '120'] },
  { brand: 'Monochrome', manufacturer: 'Fujifilm', isoSpeed: 800, developmentProcessCode: 'Instant', balance: 'daylight', filmFormatCodes: ['InstaxMini'] }
];

async function ensureByCode<TEntity extends { code: string }>(
  entityManager: EntityManager,
  entityClass: EntityClass<TEntity>,
  data: Partial<TEntity> & { code: string }
): Promise<TEntity> {
  const existing = await entityManager.findOne(entityClass, { code: data.code } as never);

  if (existing) {
    return existing;
  }

  const entity = entityManager.create(entityClass, data as never);
  entityManager.persist(entity);
  return entity;
}

export async function seedDatabase(orm: MikroORM, options: { skipMigrations?: boolean } = {}): Promise<void> {
  const em = orm.em.fork();

  if (!options.skipMigrations) {
    await orm.migrator.up();
  }

  const [filmFormatMap, developmentProcessMap] = await Promise.all([
    Promise.all(filmFormats.map(async (seed) => [seed.code, await ensureByCode(em, FilmFormatEntity, seed)] as const)),
    Promise.all(developmentProcesses.map(async (seed) => [seed.code, await ensureByCode(em, DevelopmentProcessEntity, seed)] as const))
  ]);

  const filmFormatsByCode = new Map(filmFormatMap);
  const developmentProcessesByCode = new Map(developmentProcessMap);

  for (const seed of filmStates) {
    await ensureByCode(em, FilmStateEntity, seed);
  }

  for (const seed of storageLocations) {
    await ensureByCode(em, StorageLocationEntity, seed);
  }

  for (const seed of slotStates) {
    await ensureByCode(em, SlotStateEntity, seed);
  }

  for (const seed of deviceTypes) {
    await ensureByCode(em, DeviceTypeEntity, seed);
  }

  for (const seed of holderTypes) {
    await ensureByCode(em, HolderTypeEntity, seed);
  }

  for (const seed of packageTypes) {
    const filmFormat = filmFormatsByCode.get(seed.filmFormatCode);

    if (!filmFormat) {
      throw new Error(`Missing film format ${seed.filmFormatCode}`);
    }

    const existing = await em.findOne(PackageTypeEntity, { code: seed.code, filmFormat: filmFormat.id } as never);
    if (!existing) {
      em.persist(em.create(PackageTypeEntity, { code: seed.code, label: seed.label, filmFormat }));
    }
  }

  for (const seed of emulsions) {
    const developmentProcess = developmentProcessesByCode.get(seed.developmentProcessCode);

    if (!developmentProcess) {
      throw new Error(`Missing development process ${seed.developmentProcessCode}`);
    }

    let emulsionEntity = (await em.findOne(
      EmulsionEntity,
      {
        brand: seed.brand,
        manufacturer: seed.manufacturer,
        isoSpeed: seed.isoSpeed
      } as never,
      { populate: ['developmentProcess', 'filmFormats'] }
    )) as EmulsionEntity | null;

    if (!emulsionEntity) {
      const createdEmulsion = em.create(EmulsionEntity, {
        brand: seed.brand,
        manufacturer: seed.manufacturer,
        isoSpeed: seed.isoSpeed,
        developmentProcess,
        balance: seed.balance
      }) as EmulsionEntity;

      em.persist(createdEmulsion);
      emulsionEntity = createdEmulsion;
    }

    const seededEmulsion = emulsionEntity;

    for (const filmFormatCode of seed.filmFormatCodes) {
      const filmFormat = filmFormatsByCode.get(filmFormatCode);

      if (!filmFormat) {
        throw new Error(`Missing film format ${filmFormatCode}`);
      }

      if (!seededEmulsion.filmFormats.contains(filmFormat)) {
        seededEmulsion.filmFormats.add(filmFormat);
      }
    }
  }

  const shouldSeedDemoUser = process.env['SEED_DEMO_USER'] === 'true' || process.env['SEED_TEST_USER'] === 'true';
  const testUserEmail = (process.env['TEST_USER_EMAIL'] ?? 'demo@example.com').toLowerCase().trim();
  const testUserName = process.env['TEST_USER_NAME'] ?? 'Demo User';
  const testUserPassword = process.env['TEST_USER_PASSWORD'] ?? 'password123';

  if (shouldSeedDemoUser) {
    const existingUser = await em.findOne(UserEntity, { email: testUserEmail });

    if (!existingUser) {
      em.persist(
        em.create(UserEntity, {
          email: testUserEmail,
          name: testUserName,
          passwordHash: await bcrypt.hash(testUserPassword, 12),
          createdAt: new Date().toISOString()
        })
      );
    }
  }

  await em.flush();
}

async function main(): Promise<void> {
  const orm = await MikroORM.init(ormConfig);

  try {
    await seedDatabase(orm);
  } finally {
    await orm.close(true);
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  void main();
}
