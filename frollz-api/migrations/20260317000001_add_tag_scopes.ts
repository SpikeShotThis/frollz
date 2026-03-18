import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  for (const table of ["tags", "tags_default"]) {
    const hasRollScoped = await knex.schema.hasColumn(table, "is_roll_scoped");
    if (!hasRollScoped) {
      await knex.schema.alterTable(table, (t) => {
        t.boolean("is_roll_scoped").notNullable().defaultTo(true);
      });
      await knex(table).update({ is_roll_scoped: true });
    }

    const hasStockScoped = await knex.schema.hasColumn(
      table,
      "is_stock_scoped",
    );
    if (!hasStockScoped) {
      await knex.schema.alterTable(table, (t) => {
        t.boolean("is_stock_scoped").notNullable().defaultTo(true);
      });
      await knex(table).update({ is_stock_scoped: true });
    }

    const hasUpdatedAt = await knex.schema.hasColumn(table, "updated_at");
    if (!hasUpdatedAt) {
      await knex.schema.alterTable(table, (t) => {
        t.timestamp("updated_at", { useTz: true }).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of ["tags", "tags_default"]) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn("is_roll_scoped");
      t.dropColumn("is_stock_scoped");
      t.dropColumn("updated_at");
    });
  }
}
