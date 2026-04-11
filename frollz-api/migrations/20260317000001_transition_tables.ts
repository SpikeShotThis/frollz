import type { Knex } from "knex";

// State machine tables, FK additions to film/film_state, and essential seed data.
//
// SQLite notes (used in development and test):
//   - createTable FK references are declared but not enforced without PRAGMA
//   - alterTable cannot add FK constraints to existing columns
//   - alterTable ADD COLUMN NOT NULL requires a DEFAULT value
//   - dropForeign is not supported
// All three are guarded with an isSQLite check below.

function isSQLite(knex: Knex): boolean {
  return (knex.client as { config: { client: string } }).config.client === "better-sqlite3";
}

export async function up(knex: Knex): Promise<void> {
  // transition_state -------------------------------------------------------
  await knex.schema.createTable("transition_state", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable().unique();
  });

  // transition_profile -----------------------------------------------------
  await knex.schema.createTable("transition_profile", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable().unique();
  });

  // transition_rule --------------------------------------------------------
  // to_state_id stores the id of the destination transition_state.
  await knex.schema.createTable("transition_rule", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("from_state_id")
      .notNullable()
      .references("id")
      .inTable("transition_state")
      .onDelete("CASCADE");
    t.integer("to_state_id")
      .notNullable()
      .references("id")
      .inTable("transition_state")
      .onDelete("CASCADE");
    t.integer("profile_id")
      .notNullable()
      .references("id")
      .inTable("transition_profile")
      .onDelete("CASCADE");
    t.unique(["from_state_id", "to_state_id", "profile_id"]);
  });

  // transition_metadata_field ----------------------------------------------
  await knex.schema.createTable("transition_metadata_field", (t) => {
    t.increments("id").notNullable().primary();
    t.text("name").notNullable().unique();
    t.text("field_type").notNullable(); // string | number | boolean | date
  });

  // transition_state_metadata ----------------------------------------------
  // Associates metadata fields with the destination state they belong to.
  await knex.schema.createTable("transition_state_metadata", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("field_id")
      .notNullable()
      .references("id")
      .inTable("transition_metadata_field")
      .onDelete("CASCADE");
    t.integer("transition_state_id")
      .notNullable()
      .references("id")
      .inTable("transition_state")
      .onDelete("CASCADE");
    t.text("default_value").nullable();
    t.unique(["field_id", "transition_state_id"]);
  });

  // film_state_metadata ----------------------------------------------------
  // Records which metadata fields were captured when a film_state was entered.
  await knex.schema.createTable("film_state_metadata", (t) => {
    t.increments("id").notNullable().primary();
    t.integer("film_state_id")
      .notNullable()
      .references("id")
      .inTable("film_state")
      .onDelete("CASCADE");
    t.integer("transition_state_metadata_id")
      .notNullable()
      .references("id")
      .inTable("transition_state_metadata")
      .onDelete("CASCADE");
  });

  // Add transition_profile_id to film (no existing rows on fresh schema) ---
  // SQLite: ADD COLUMN NOT NULL requires a DEFAULT; FK constraints not supported
  // via alterTable. Both limitations are acceptable for dev/test — the column
  // value is always provided by application code.
  await knex.schema.alterTable("film", (t) => {
    const col = t.integer("transition_profile_id");
    if (isSQLite(knex)) {
      col.nullable();
    } else {
      col.notNullable().references("id").inTable("transition_profile").onDelete("RESTRICT");
    }
  });

  // Add FK from film_state.state_id → transition_state (PostgreSQL only) ---
  if (!isSQLite(knex)) {
    await knex.schema.alterTable("film_state", (t) => {
      t.foreign("state_id").references("id").inTable("transition_state").onDelete("RESTRICT");
    });
  }

  // -----------------------------------------------------------------------
  // Seed: states
  // -----------------------------------------------------------------------
  const stateNames = [
    "Added",
    "Frozen",
    "Refrigerated",
    "Shelved",
    "Loaded",
    "Finished",
    "Sent For Development",
    "Developed",
    "Received",
  ];
  await knex("transition_state").insert(stateNames.map((name) => ({ name })));
  const insertedStates = await knex<{ id: number; name: string }>("transition_state").select("id", "name");
  const stateId = (name: string) => insertedStates.find((s) => s.name === name)!.id;

  // -----------------------------------------------------------------------
  // Seed: profiles
  // -----------------------------------------------------------------------
  await knex("transition_profile").insert([
    { name: "standard" },
    { name: "instant" },
    { name: "bulk" },
  ]);
  const insertedProfiles = await knex<{ id: number; name: string }>("transition_profile").select("id", "name");
  const profileId = (name: string) => insertedProfiles.find((p) => p.name === name)!.id;

  const std = profileId("standard");
  const inst = profileId("instant");
  const bulk = profileId("bulk");

  // -----------------------------------------------------------------------
  // Seed: rules
  // -----------------------------------------------------------------------
  type RuleRow = { from_state_id: number; to_state_id: number; profile_id: number };

  const rules: RuleRow[] = [
    // --- standard: forward ------------------------------------------------
    {  from_state_id: stateId("Added"), to_state_id: stateId("Frozen"), profile_id: std },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Refrigerated"), profile_id: std },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Shelved"), profile_id: std },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Refrigerated"), profile_id: std },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Shelved"), profile_id: std },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Shelved"), profile_id: std },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Loaded"), profile_id: std },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Finished"), profile_id: std },
    {  from_state_id: stateId("Finished"), to_state_id: stateId("Sent For Development"), profile_id: std },
    {  from_state_id: stateId("Sent For Development"), to_state_id: stateId("Developed"), profile_id: std },
    {  from_state_id: stateId("Developed"), to_state_id: stateId("Received"), profile_id: std },
    // --- standard: backward -----------------------------------------------
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Added"), profile_id: std },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Frozen"), profile_id: std },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Added"), profile_id: std },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Refrigerated"), profile_id: std },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Frozen"), profile_id: std },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Shelved"), profile_id: std },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Refrigerated"), profile_id: std },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Frozen"), profile_id: std },
    {  from_state_id: stateId("Finished"), to_state_id: stateId("Loaded"), profile_id: std },
    {  from_state_id: stateId("Sent For Development"), to_state_id: stateId("Finished"), profile_id: std },
    {  from_state_id: stateId("Developed"), to_state_id: stateId("Sent For Development"), profile_id: std },
    {  from_state_id: stateId("Received"), to_state_id: stateId("Developed"), profile_id: std },

    // --- instant: forward (skips lab; Finished → Received directly) -------
    {  from_state_id: stateId("Added"), to_state_id: stateId("Frozen"), profile_id: inst },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Refrigerated"), profile_id: inst },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Shelved"), profile_id: inst },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Refrigerated"), profile_id: inst },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Shelved"), profile_id: inst },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Shelved"), profile_id: inst },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Loaded"), profile_id: inst },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Finished"), profile_id: inst },
    {  from_state_id: stateId("Finished"), to_state_id: stateId("Received"), profile_id: inst },
    // --- instant: backward ------------------------------------------------
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Added"), profile_id: inst },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Frozen"), profile_id: inst },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Added"), profile_id: inst },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Refrigerated"), profile_id: inst },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Frozen"), profile_id: inst },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Shelved"), profile_id: inst },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Refrigerated"), profile_id: inst },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Frozen"), profile_id: inst },
    {  from_state_id: stateId("Finished"), to_state_id: stateId("Loaded"), profile_id: inst },
    {  from_state_id: stateId("Received"), to_state_id: stateId("Finished"), profile_id: inst },

    // --- bulk: forward (storage + loading only, no lab chain) -------------
    {  from_state_id: stateId("Added"), to_state_id: stateId("Frozen"), profile_id: bulk },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Refrigerated"), profile_id: bulk },
    {  from_state_id: stateId("Added"), to_state_id: stateId("Shelved"), profile_id: bulk },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Refrigerated"), profile_id: bulk },
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Shelved"), profile_id: bulk },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Shelved"), profile_id: bulk },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Loaded"), profile_id: bulk },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Finished"), profile_id: bulk },
    // --- bulk: backward ---------------------------------------------------
    {  from_state_id: stateId("Frozen"), to_state_id: stateId("Added"), profile_id: bulk },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Frozen"), profile_id: bulk },
    {  from_state_id: stateId("Refrigerated"), to_state_id: stateId("Added"), profile_id: bulk },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Refrigerated"), profile_id: bulk },
    {  from_state_id: stateId("Shelved"), to_state_id: stateId("Frozen"), profile_id: bulk },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Shelved"), profile_id: bulk },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Refrigerated"), profile_id: bulk },
    {  from_state_id: stateId("Loaded"), to_state_id: stateId("Frozen"), profile_id: bulk },
    {  from_state_id: stateId("Finished"), to_state_id: stateId("Loaded"), profile_id: bulk },
  ];

  await knex("transition_rule").insert(rules);

  // -----------------------------------------------------------------------
  // Seed: metadata fields
  // -----------------------------------------------------------------------
  const fieldRows = [
    {  name: "temperature", field_type: "number" },
    {  name: "shotISO", field_type: "number" },
    {  name: "labName", field_type: "string" },
    {  name: "deliveryMethod", field_type: "string" },
    {  name: "processRequested", field_type: "string" },
    {  name: "pushPullStops", field_type: "number" },
    {  name: "scansReceived", field_type: "boolean" },
    {  name: "scansUrl", field_type: "string" },
    {  name: "negativesReceived", field_type: "boolean" },
    {  name: "negativesDate", field_type: "date" },
  ];
  await knex("transition_metadata_field").insert(fieldRows);
  const insertedFields = await knex<{ id: number; name: string }>("transition_metadata_field").select("id", "name");
  const fieldId = (name: string) => insertedFields.find((f) => f.name === name)!.id;

  // -----------------------------------------------------------------------
  // Seed: state metadata associations
  // -----------------------------------------------------------------------
  await knex("transition_state_metadata").insert([
    {  field_id: fieldId("temperature"), transition_state_id: stateId("Frozen"), default_value: null },
    {  field_id: fieldId("temperature"), transition_state_id: stateId("Refrigerated"), default_value: null },
    {  field_id: fieldId("shotISO"), transition_state_id: stateId("Finished"), default_value: null },
    {  field_id: fieldId("labName"), transition_state_id: stateId("Sent For Development"), default_value: null },
    {  field_id: fieldId("deliveryMethod"), transition_state_id: stateId("Sent For Development"), default_value: null },
    {  field_id: fieldId("processRequested"), transition_state_id: stateId("Sent For Development"), default_value: null },
    {  field_id: fieldId("pushPullStops"), transition_state_id: stateId("Sent For Development"), default_value: null },
    {  field_id: fieldId("scansReceived"), transition_state_id: stateId("Received"), default_value: null },
    {  field_id: fieldId("scansUrl"), transition_state_id: stateId("Received"), default_value: null },
    {  field_id: fieldId("negativesReceived"), transition_state_id: stateId("Received"), default_value: null },
    {  field_id: fieldId("negativesDate"), transition_state_id: stateId("Received"), default_value: null },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("film_state_metadata");
  await knex.schema.dropTableIfExists("transition_state_metadata");
  await knex.schema.dropTableIfExists("transition_metadata_field");

  if (!isSQLite(knex)) {
    await knex.schema.alterTable("film_state", (t) => {
      t.dropForeign(["state_id"]);
    });
  }

  await knex.schema.alterTable("film", (t) => {
    t.dropColumn("transition_profile_id");
  });

  await knex.schema.dropTableIfExists("transition_rule");
  await knex.schema.dropTableIfExists("transition_profile");
  await knex.schema.dropTableIfExists("transition_state");
}
