import type { Knex } from "knex";

// Core domain tables.
// Transition tables (transition_state, transition_rule, etc.) are in
// 20260317000001 so FK constraints from film/film_state can be added properly.

async function createMirror(
  knex: Knex,
  name: string,
  define: (t: Knex.CreateTableBuilder) => void,
) {
  await knex.schema.createTable(name, define);
  await knex.schema.createTable(`${name}_default`, define);
}

export async function up(knex: Knex): Promise<void> {
  // package ---------------------------------------------------------------
  await createMirror(knex, "package", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable().unique();
  });

  // process ---------------------------------------------------------------
  await createMirror(knex, "process", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable().unique();
  });

  // format ----------------------------------------------------------------
  await knex.schema.createTable("format", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("package_id")
      .notNullable()
      .references("id")
      .inTable("package")
      .onDelete("RESTRICT");
    t.text("name").notNullable();
  });

  await knex.schema.createTable("format_default", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("package_id")
      .notNullable()
      .references("id")
      .inTable("package_default")
      .onDelete("RESTRICT");
    t.text("name").notNullable();
  });

  // tag -------------------------------------------------------------------
  await createMirror(knex, "tag", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable();
    t.text("color_code").notNullable();
    t.text("description").nullable();
  });

  // emulsion --------------------------------------------------------------
  await knex.schema.createTable("emulsion", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("parent_id")
      .nullable()
      .references("id")
      .inTable("emulsion")
      .onDelete("SET NULL");
    t.integer("process_id")
      .notNullable()
      .references("id")
      .inTable("process")
      .onDelete("RESTRICT");
    t.integer("format_id")
      .notNullable()
      .references("id")
      .inTable("format")
      .onDelete("RESTRICT");
    t.text("name").notNullable();
    t.text("brand").notNullable();
    t.text("manufacturer").notNullable();
    t.integer("speed").notNullable();
  });

  await knex.schema.createTable("emulsion_default", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("parent_id")
      .nullable()
      .references("id")
      .inTable("emulsion_default")
      .onDelete("SET NULL");
    t.integer("process_id")
      .notNullable()
      .references("id")
      .inTable("process_default")
      .onDelete("RESTRICT");
    t.integer("format_id")
      .notNullable()
      .references("id")
      .inTable("format_default")
      .onDelete("RESTRICT");
    t.text("name").notNullable();
    t.text("brand").notNullable();
    t.text("manufacturer").notNullable();
    t.integer("speed").notNullable();
  });

  // emulsion_tag ----------------------------------------------------------
  await knex.schema.createTable("emulsion_tag", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("emulsion_id")
      .notNullable()
      .references("id")
      .inTable("emulsion")
      .onDelete("CASCADE");
    t.integer("tag_id")
      .notNullable()
      .references("id")
      .inTable("tag")
      .onDelete("CASCADE");
    t.unique(["emulsion_id", "tag_id"]);
  });

  await knex.schema.createTable("emulsion_tag_default", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("emulsion_id")
      .notNullable()
      .references("id")
      .inTable("emulsion_default")
      .onDelete("CASCADE");
    t.integer("tag_id")
      .notNullable()
      .references("id")
      .inTable("tag_default")
      .onDelete("CASCADE");
    t.unique(["emulsion_id", "tag_id"]);
  });

  // film ------------------------------------------------------------------
  // transition_profile_id FK added in 20260317000001 after transition_profile exists
  await knex.schema.createTable("film", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable();
    t.integer("parent_id")
      .nullable()
      .references("id")
      .inTable("film")
      .onDelete("SET NULL");
    t.integer("emulsion_id")
      .notNullable()
      .references("id")
      .inTable("emulsion")
      .onDelete("RESTRICT");
    t.timestamp("expiration_date", { useTz: true }).nullable();
  });

  // film_tag --------------------------------------------------------------
  await knex.schema.createTable("film_tag", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("film_id")
      .notNullable()
      .references("id")
      .inTable("film")
      .onDelete("CASCADE");
    t.integer("tag_id")
      .notNullable()
      .references("id")
      .inTable("tag")
      .onDelete("CASCADE");
    t.unique(["film_id", "tag_id"]);
  });

  // film_state ------------------------------------------------------------
  // state_id FK to transition_state added in 20260317000001
  await knex.schema.createTable("film_state", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("film_id")
      .notNullable()
      .references("id")
      .inTable("film")
      .onDelete("CASCADE");
    t.integer("state_id").notNullable();
    t.timestamp("date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.text("note").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("film_state");
  await knex.schema.dropTableIfExists("film_tag");
  await knex.schema.dropTableIfExists("film");
  await knex.schema.dropTableIfExists("emulsion_tag_default");
  await knex.schema.dropTableIfExists("emulsion_tag");
  await knex.schema.dropTableIfExists("emulsion_default");
  await knex.schema.dropTableIfExists("emulsion");
  await knex.schema.dropTableIfExists("tag_default");
  await knex.schema.dropTableIfExists("tag");
  await knex.schema.dropTableIfExists("format_default");
  await knex.schema.dropTableIfExists("format");
  await knex.schema.dropTableIfExists("process_default");
  await knex.schema.dropTableIfExists("process");
  await knex.schema.dropTableIfExists("package_default");
  await knex.schema.dropTableIfExists("package");
}
