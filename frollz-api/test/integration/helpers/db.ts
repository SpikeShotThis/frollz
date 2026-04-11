import Knex, { Knex as KnexType } from 'knex';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(__dirname, '../../../migrations');

/**
 * Creates a fresh in-memory SQLite database and runs all migrations.
 * Returns the Knex instance. Call knex.destroy() in afterAll.
 */
export async function createTestDb(): Promise<KnexType> {
  const knex = Knex({
    client: 'better-sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
  });

  await knex.migrate.latest({
    directory: MIGRATIONS_DIR,
    loadExtensions: ['.ts', '.js'],
  });

  return knex;
}

/**
 * Seeds the minimum supporting rows needed by emulsion and film tests:
 *   - one package  (e.g. "135mm")
 *   - one process  (e.g. "C-41")
 *   - one format   linked to that package
 *   - one tag      for tagging tests
 *
 * Returns the generated ids so tests can reference them.
 */
export async function seedSupporting(knex: KnexType): Promise<{
  packageId: number;
  processId: number;
  formatId: number;
  tagId: number;
}> {
  const [packageId] = await knex('package').insert({ name: '135mm' });
  const [processId] = await knex('process').insert({ name: 'C-41' });
  const [formatId] = await knex('format').insert({ name: '36exp', package_id: packageId });
  const [tagId] = await knex('tag').insert({
    name: 'test-tag',
    color_code: '#ff0000',
    description: 'A tag used in tests',
  });

  return { packageId, processId, formatId, tagId };
}

/**
 * Looks up the id of a transition_profile by name (seeded by migration 2).
 */
export async function profileId(knex: KnexType, name: string): Promise<number> {
  const row = await knex('transition_profile').where({ name }).first();
  if (!row) throw new Error(`transition_profile '${name}' not found — was migration 2 applied?`);
  return row.id;
}

/**
 * Looks up the id of a transition_state by name (seeded by migration 2).
 */
export async function stateId(knex: KnexType, name: string): Promise<number> {
  const row = await knex('transition_state').where({ name }).first();
  if (!row) throw new Error(`transition_state '${name}' not found — was migration 2 applied?`);
  return row.id;
}
