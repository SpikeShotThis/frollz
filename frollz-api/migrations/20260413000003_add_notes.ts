import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("note", (t) => {
        t.increments("id").notNullable().primary();
        t.integer("entity_id").notNullable();
        t.text("entity_type").notNullable();
        t.text("text").notNullable();
        t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("note");
}
