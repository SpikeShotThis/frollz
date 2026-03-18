import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  for (const table of ["tags", "tags_default"]) {
    const hasIsSystem = await knex.schema.hasColumn(table, "is_system");
    if (!hasIsSystem) {
      await knex.schema.alterTable(table, (t) => {
        t.boolean("is_system").notNullable().defaultTo(false);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of ["tags", "tags_default"]) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn("is_system");
    });
  }
}
