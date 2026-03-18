import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("roll_tags"))) {
    await knex.schema.createTable("roll_tags", (table) => {
      table.text("id").primary();
      table.text("roll_key").notNullable().references("id").inTable("rolls");
      table.text("tag_key").notNullable().references("id").inTable("tags");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.unique(["roll_key", "tag_key"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("roll_tags");
}
