import type { Knex } from "knex";

// Adds value storage to film_state_metadata and allow_multiple support to
// transition_metadata_field. Sets scansUrl as the first multi-value field.

function isSQLite(knex: Knex): boolean {
  return (knex.client as { config: { client: string } }).config.client === "better-sqlite3";
}

export async function up(knex: Knex): Promise<void> {
  // Add allow_multiple to transition_metadata_field
  await knex.schema.alterTable("transition_metadata_field", (t) => {
    if (isSQLite(knex)) {
      t.boolean("allow_multiple").notNullable().defaultTo(false);
    } else {
      t.boolean("allow_multiple").notNullable().defaultTo(false);
    }
  });

  // Add value to film_state_metadata
  await knex.schema.alterTable("film_state_metadata", (t) => {
    t.text("value").nullable();
  });

  // Mark scansUrl as allow_multiple
  await knex("transition_metadata_field")
    .where({ name: "scansUrl" })
    .update({ allow_multiple: true });
}

export async function down(knex: Knex): Promise<void> {
  await knex("transition_metadata_field")
    .where({ name: "scansUrl" })
    .update({ allow_multiple: false });

  await knex.schema.alterTable("film_state_metadata", (t) => {
    t.dropColumn("value");
  });

  await knex.schema.alterTable("transition_metadata_field", (t) => {
    t.dropColumn("allow_multiple");
  });
}
