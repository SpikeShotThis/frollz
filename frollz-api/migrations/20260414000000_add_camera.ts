import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("camera", (t) => {
    t.increments("id").notNullable().primary();
    t.string("brand").notNullable();
    t.string("model").notNullable();
    t.string("serial_number").nullable();
    t.date("acquired_at").nullable();
    t.decimal("purchase_price", 10, 2).nullable();
    t.string("status").notNullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    t.unique(["brand", "model", "serial_number"]);
  });

  await knex.schema.createTable("camera_accepted_format", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("camera_id").notNullable().references("id").inTable("camera").onDelete("CASCADE");
    t.integer("format_id").notNullable().references("id").inTable("format").onDelete("CASCADE");
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("camera");
  await knex.schema.dropTable("camera_accepted_format");
}