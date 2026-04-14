import type { Knex } from "knex";
// SQLite does not support ALTER TABLE … DROP COLUMN when other tables hold FK
// references to the table being altered (Knex internally drops and recreates
// the table). We therefore use the standard SQLite column-removal workaround:
// disable FK enforcement, recreate the table without the column, copy data,
// swap table names, then re-enable FK enforcement.
//
// PostgreSQL handles the simple ALTER TABLE path without issue.

export const config = { transaction: false };

const isSQLite = (knex: Knex): boolean =>
  (knex.client as { config: { client: string } }).config.client === "sqlite3";

// Columns present after the migration (name removed).
const COLS_WITHOUT_NOTE =
  "id, film_id, state_id, date";

async function recreateWithoutNote(
  knex: Knex,
  table: "film_state"
): Promise<void> {
  const tmp = `${table}_new`;

  await knex.raw(`
    CREATE TABLE ${tmp} (
      id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      film_id  INTEGER NOT NULL     REFERENCES film(id)         ON DELETE RESTRICT,
      state_id INTEGER NOT NULL REFERENCES transition_state(id)    ON DELETE RESTRICT,
      date     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await knex.raw(
    `INSERT INTO ${tmp} (${COLS_WITHOUT_NOTE}) SELECT ${COLS_WITHOUT_NOTE} FROM ${table}`
  );
  await knex.raw(`DROP TABLE ${table}`);
  await knex.raw(`ALTER TABLE ${tmp} RENAME TO ${table}`);
}

async function recreateWithNote(
  knex: Knex,
  table: "film_state"
): Promise<void> {
  const tmp = `${table}_new`;

  await knex.raw(`
    CREATE TABLE ${tmp} (
      id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      film_id  INTEGER NOT NULL     REFERENCES film(id)         ON DELETE RESTRICT,
      state_id INTEGER NOT NULL REFERENCES transition_state(id)    ON DELETE RESTRICT,
      date     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note     TEXT NOT NULL DEFAULT ''
    )
  `);

  await knex.raw(
    `INSERT INTO ${tmp} (${COLS_WITHOUT_NOTE}, note) SELECT ${COLS_WITHOUT_NOTE}, '' FROM ${table}`
  );
  await knex.raw(`DROP TABLE ${table}`);
  await knex.raw(`ALTER TABLE ${tmp} RENAME TO ${table}`);
}

export async function up(knex: Knex): Promise<void> {
  if (isSQLite(knex)) {
    await knex.raw("PRAGMA foreign_keys = OFF");
    await recreateWithoutNote(knex, "film_state");
    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    await knex.schema.alterTable("film_state", (t) => {
      t.dropColumn("note");
    });
  }

   await knex.schema.createTable("note", (t) => {
        t.increments("id").notNullable().primary();
        t.integer("entity_id").notNullable();
        t.text("entity_type").notNullable();
        t.text("text").notNullable();
        t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
  if (isSQLite(knex)) {
    await knex.raw("PRAGMA foreign_keys = OFF");
    await recreateWithNote(knex, "film_state");
    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    await knex.schema.alterTable("film_state", (t) => {
      t.text("note").notNullable().defaultTo("");

    });
  }
  await knex.schema.dropTable("note");
}