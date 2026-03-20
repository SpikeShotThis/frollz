import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // set date = created_at for all existing roll states
  await knex("roll_states").update({
    date: knex.ref("created_at"),
  });

  // make date default to now and remove created_at and updated_at
  await knex.schema.alterTable("roll_states", (table) => {
    table
      .timestamp("date", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .alter();
    table.dropColumn("created_at");
    table.dropColumn("updated_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  // add created_at and updated_at columns back
  await knex.schema.alterTable("roll_states", (table) => {
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true });
  });

  // set created_at = date for all existing roll states
  await knex("roll_states").update({
    created_at: knex.ref("date"),
    updated_at: knex.ref("date"),
  });

  // remove default from date and make it nullable
  await knex.schema.alterTable("roll_states", (table) => {
    table.timestamp("date", { useTz: true }).notNullable().alter();
  });
}
