import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("transition_states", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique();
  });

  await knex.schema.createTable("transition_types", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique();
  });

  await knex.schema.createTable("transition_metadata_field_types", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique();
  });

  await knex.schema.createTable("transitions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("from_state_id")
      .notNullable()
      .references("id")
      .inTable("transition_states")
      .onDelete("CASCADE");
    t.uuid("to_state_id")
      .notNullable()
      .references("id")
      .inTable("transition_states")
      .onDelete("CASCADE");
    t.uuid("transition_type_id")
      .notNullable()
      .references("id")
      .inTable("transition_types")
      .onDelete("RESTRICT");
    t.boolean("requires_date").notNullable().defaultTo(false);
    t.unique(["from_state_id", "to_state_id"]);
  });

  await knex.schema.createTable("transition_metadata", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("transition_id")
      .notNullable()
      .references("id")
      .inTable("transitions")
      .onDelete("CASCADE");
    t.string("field").notNullable();
    t.uuid("field_type_id")
      .notNullable()
      .references("id")
      .inTable("transition_metadata_field_types")
      .onDelete("RESTRICT");
    t.string("default_value").nullable();
    t.boolean("is_required").notNullable().defaultTo(true);
    t.unique(["transition_id", "field"]);
  });

  // --- Seed lookup tables ---

  await knex("transition_states").insert([
    { name: "Added" },
    { name: "Frozen" },
    { name: "Refrigerated" },
    { name: "Shelved" },
    { name: "Loaded" },
    { name: "Finished" },
    { name: "Sent For Development" },
    { name: "Developed" },
    { name: "Received" },
  ]);

  await knex("transition_types").insert([
    { name: "FORWARD" },
    { name: "BACKWARD" },
  ]);

  await knex("transition_metadata_field_types").insert([
    { name: "string" },
    { name: "number" },
    { name: "boolean" },
    { name: "date" },
  ]);

  // --- Seed transitions ---
  // Fetch IDs for inline reference
  const states = await knex("transition_states").select("id", "name");
  const stateId = (name: string) =>
    states.find((s) => s.name === name)!.id as string;

  const types = await knex("transition_types").select("id", "name");
  const typeId = (name: string) =>
    types.find((t) => t.name === name)!.id as string;

  const fieldTypes = await knex("transition_metadata_field_types").select(
    "id",
    "name",
  );
  const fieldTypeId = (name: string) =>
    fieldTypes.find((f) => f.name === name)!.id as string;

  const fwd = typeId("FORWARD");
  const bwd = typeId("BACKWARD");

  const transitionRows: {
    from_state_id: string;
    to_state_id: string;
    transition_type_id: string;
    requires_date: boolean;
  }[] = [
    // FORWARD
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Frozen"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Loaded"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Finished"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Finished"),
      to_state_id: stateId("Sent For Development"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Sent For Development"),
      to_state_id: stateId("Developed"),
      transition_type_id: fwd,
      requires_date: true,
    },
    {
      from_state_id: stateId("Developed"),
      to_state_id: stateId("Received"),
      transition_type_id: fwd,
      requires_date: false,
    },
    // BACKWARD
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Shelved"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Finished"),
      to_state_id: stateId("Loaded"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Sent For Development"),
      to_state_id: stateId("Finished"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Developed"),
      to_state_id: stateId("Sent For Development"),
      transition_type_id: bwd,
      requires_date: false,
    },
    {
      from_state_id: stateId("Received"),
      to_state_id: stateId("Developed"),
      transition_type_id: bwd,
      requires_date: false,
    },
  ];

  await knex("transitions").insert(transitionRows);

  // --- Seed transition metadata ---
  const allTransitions = await knex("transitions")
    .join("transition_states as fs", "transitions.from_state_id", "fs.id")
    .join("transition_states as ts", "transitions.to_state_id", "ts.id")
    .select("transitions.id", "fs.name as from_name", "ts.name as to_name");

  const transId = (from: string, to: string) =>
    allTransitions.find((t) => t.from_name === from && t.to_name === to)!
      .id as string;

  const num = fieldTypeId("number");
  const str = fieldTypeId("string");
  const bool = fieldTypeId("boolean");
  const date = fieldTypeId("date");

  const metadataRows: {
    transition_id: string;
    field: string;
    field_type_id: string;
    default_value: string | null;
    is_required: boolean;
  }[] = [
    // FROZEN — temperature
    {
      transition_id: transId("Added", "Frozen"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Frozen", "Refrigerated"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Frozen", "Shelved"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    // REFRIGERATED — temperature
    {
      transition_id: transId("Added", "Refrigerated"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Refrigerated", "Shelved"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    // SHELVED — temperature
    {
      transition_id: transId("Added", "Shelved"),
      field: "temperature",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    // FINISHED — shotISO
    {
      transition_id: transId("Loaded", "Finished"),
      field: "shotISO",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    // SENT_FOR_DEVELOPMENT — labName, deliveryMethod, processRequested, pushPullStops
    {
      transition_id: transId("Finished", "Sent For Development"),
      field: "labName",
      field_type_id: str,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Finished", "Sent For Development"),
      field: "deliveryMethod",
      field_type_id: str,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Finished", "Sent For Development"),
      field: "processRequested",
      field_type_id: str,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Finished", "Sent For Development"),
      field: "pushPullStops",
      field_type_id: num,
      default_value: null,
      is_required: false,
    },
    // RECEIVED — scansReceived, scansUrl, negativesReceived, negativesDate
    {
      transition_id: transId("Developed", "Received"),
      field: "scansReceived",
      field_type_id: bool,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Developed", "Received"),
      field: "scansUrl",
      field_type_id: str,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Developed", "Received"),
      field: "negativesReceived",
      field_type_id: bool,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: transId("Developed", "Received"),
      field: "negativesDate",
      field_type_id: date,
      default_value: null,
      is_required: false,
    },
  ];

  // suppress unused var warning — date is used in metadataRows
  void date;
  void bool;
  await knex("transition_metadata").insert(metadataRows);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("transition_metadata");
  await knex.schema.dropTableIfExists("transitions");
  await knex.schema.dropTableIfExists("transition_metadata_field_types");
  await knex.schema.dropTableIfExists("transition_types");
  await knex.schema.dropTableIfExists("transition_states");
}
