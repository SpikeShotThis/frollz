import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasMetadata = await knex.schema.hasColumn("roll_states", "metadata");
  if (!hasMetadata) {
    await knex.schema.table("roll_states", (t) => {
      t.jsonb("metadata").nullable();
      t.boolean("is_error_correction").nullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table("roll_states", (t) => {
    t.dropColumn("metadata");
    t.dropColumn("is_error_correction");
  });
}
