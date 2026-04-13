import type { Knex } from "knex";

// Adds binary blob storage for emulsion box images.
// box_image_data: raw image bytes (bytea in PG, BLOB in SQLite)
// box_image_mime_type: MIME type string, e.g. "image/jpeg"
// Both columns are nullable — existing emulsions have no image.

export async function up(knex: Knex): Promise<void> {
  for (const table of ["emulsion", "emulsion_default"]) {
    if (!(await knex.schema.hasColumn(table, "box_image_data"))) {
      await knex.schema.alterTable(table, (t) => {
        t.binary("box_image_data").nullable();
        t.string("box_image_mime_type").nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of ["emulsion", "emulsion_default"]) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn("box_image_data");
      t.dropColumn("box_image_mime_type");
    });
  }
}
