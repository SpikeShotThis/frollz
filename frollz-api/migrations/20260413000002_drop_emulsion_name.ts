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
const COLS_WITHOUT_NAME =
  "id, parent_id, process_id, format_id, brand, manufacturer, speed, box_image_data, box_image_mime_type";

async function recreateWithoutName(
  knex: Knex,
  table: "emulsion" | "emulsion_default"
): Promise<void> {
  const sfx = table === "emulsion_default" ? "_default" : "";
  const tmp = `${table}_new`;

  await knex.raw(`
    CREATE TABLE ${tmp} (
      id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER NULL     REFERENCES ${table}(id)         ON DELETE SET NULL,
      process_id INTEGER NOT NULL REFERENCES process${sfx}(id)    ON DELETE RESTRICT,
      format_id  INTEGER NOT NULL REFERENCES format${sfx}(id)     ON DELETE RESTRICT,
      brand        TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      speed        INTEGER NOT NULL,
      box_image_data       BLOB NULL,
      box_image_mime_type  TEXT NULL
    )
  `);

  await knex.raw(
    `INSERT INTO ${tmp} (${COLS_WITHOUT_NAME}) SELECT ${COLS_WITHOUT_NAME} FROM ${table}`
  );
  await knex.raw(`DROP TABLE ${table}`);
  await knex.raw(`ALTER TABLE ${tmp} RENAME TO ${table}`);
}

async function recreateWithName(
  knex: Knex,
  table: "emulsion" | "emulsion_default"
): Promise<void> {
  const sfx = table === "emulsion_default" ? "_default" : "";
  const tmp = `${table}_new`;

  await knex.raw(`
    CREATE TABLE ${tmp} (
      id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER NULL     REFERENCES ${table}(id)         ON DELETE SET NULL,
      process_id INTEGER NOT NULL REFERENCES process${sfx}(id)    ON DELETE RESTRICT,
      format_id  INTEGER NOT NULL REFERENCES format${sfx}(id)     ON DELETE RESTRICT,
      name         TEXT NOT NULL DEFAULT '',
      brand        TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      speed        INTEGER NOT NULL,
      box_image_data       BLOB NULL,
      box_image_mime_type  TEXT NULL
    )
  `);

  const colsWithName =
    "id, parent_id, process_id, format_id, '' AS name, brand, manufacturer, speed, box_image_data, box_image_mime_type";
  const insertCols =
    "id, parent_id, process_id, format_id, name, brand, manufacturer, speed, box_image_data, box_image_mime_type";

  await knex.raw(
    `INSERT INTO ${tmp} (${insertCols}) SELECT ${colsWithName} FROM ${table}`
  );
  await knex.raw(`DROP TABLE ${table}`);
  await knex.raw(`ALTER TABLE ${tmp} RENAME TO ${table}`);
}

export async function up(knex: Knex): Promise<void> {
  if (isSQLite(knex)) {
    await knex.raw("PRAGMA foreign_keys = OFF");
    await recreateWithoutName(knex, "emulsion");
    await recreateWithoutName(knex, "emulsion_default");
    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    for (const table of ["emulsion", "emulsion_default"] as const) {
      await knex.schema.alterTable(table, (t) => {
        t.dropColumn("name");
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (isSQLite(knex)) {
    await knex.raw("PRAGMA foreign_keys = OFF");
    await recreateWithName(knex, "emulsion");
    await recreateWithName(knex, "emulsion_default");
    await knex.raw("PRAGMA foreign_keys = ON");
  } else {
    for (const table of ["emulsion", "emulsion_default"] as const) {
      await knex.schema.alterTable(table, (t) => {
        t.text("name").notNullable().defaultTo("");
      });
    }
  }
}
