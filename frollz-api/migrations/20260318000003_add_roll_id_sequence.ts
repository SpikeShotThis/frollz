import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Seed the sequence from the highest existing numeric roll_id so that
  // new IDs never collide with rolls already in the database.
  await knex.raw(`
    CREATE SEQUENCE IF NOT EXISTS roll_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
  `);

  // Advance the sequence past any existing numeric roll_ids so there are
  // no collisions if the database already has rolls with numeric IDs.
  await knex.raw(`
    SELECT setval(
      'roll_id_seq',
      GREATEST(
        (SELECT COALESCE(MAX(roll_id::bigint), 0) FROM rolls WHERE roll_id ~ '^[0-9]+$'),
        1
      )
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP SEQUENCE IF EXISTS roll_id_seq`);
}
