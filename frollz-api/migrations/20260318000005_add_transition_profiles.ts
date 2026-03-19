import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create transition_profiles lookup table
  await knex.schema.createTable("transition_profiles", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable().unique();
  });

  await knex("transition_profiles").insert([
    { name: "standard" },
    { name: "instant" },
  ]);

  // 2. Add profile_id FK to transitions (nullable first so we can backfill)
  await knex.schema.alterTable("transitions", (t) => {
    t.uuid("profile_id")
      .nullable()
      .references("id")
      .inTable("transition_profiles")
      .onDelete("CASCADE");
  });

  // 3. Backfill existing transitions to the 'standard' profile
  const [standardProfile] = await knex("transition_profiles")
    .where("name", "standard")
    .select("id");
  await knex("transitions").update({ profile_id: standardProfile.id });

  // 4. Make profile_id NOT NULL
  await knex.raw(
    `ALTER TABLE transitions ALTER COLUMN profile_id SET NOT NULL`,
  );

  // 5. Replace old unique(from_state_id, to_state_id) with
  //    unique(from_state_id, to_state_id, profile_id) so each profile
  //    can define its own edge set
  await knex.raw(
    `ALTER TABLE transitions DROP CONSTRAINT transitions_from_state_id_to_state_id_unique`,
  );
  await knex.schema.alterTable("transitions", (t) => {
    t.unique(["from_state_id", "to_state_id", "profile_id"]);
  });

  // 6. Add transition_profile column to rolls (default 'standard' for all
  //    existing rolls)
  await knex.schema.alterTable("rolls", (t) => {
    t.string("transition_profile").notNullable().defaultTo("standard");
  });

  // --- Seed instant profile transitions ---

  const profiles = await knex("transition_profiles").select("id", "name");
  const instantId = profiles.find((p) => p.name === "instant")!.id as string;

  const states = await knex("transition_states").select("id", "name");
  const stateId = (name: string) =>
    states.find((s) => s.name === name)!.id as string;

  const types = await knex("transition_types").select("id", "name");
  const typeId = (name: string) =>
    types.find((t) => t.name === name)!.id as string;

  const fwd = typeId("FORWARD");
  const bwd = typeId("BACKWARD");

  // The instant profile skips the lab chain (Finished→SentForDev→Developed)
  // and goes directly Finished→Received.
  const instantTransitions: {
    from_state_id: string;
    to_state_id: string;
    transition_type_id: string;
    requires_date: boolean;
    profile_id: string;
  }[] = [
    // FORWARD — storage + loading (same as standard)
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Frozen"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Loaded"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Finished"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: instantId,
    },
    // FORWARD — instant skips lab, goes directly Finished→Received
    {
      from_state_id: stateId("Finished"),
      to_state_id: stateId("Received"),
      transition_type_id: fwd,
      requires_date: false,
      profile_id: instantId,
    },
    // BACKWARD — mirrors standard minus lab-chain backward edges
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Shelved"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    {
      from_state_id: stateId("Finished"),
      to_state_id: stateId("Loaded"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
    // BACKWARD — for instant, Received goes back to Finished (not Developed)
    {
      from_state_id: stateId("Received"),
      to_state_id: stateId("Finished"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: instantId,
    },
  ];

  await knex("transitions").insert(instantTransitions);

  // 7. Seed metadata for the instant Finished→Received transition
  //    (scans/negatives — same fields as standard Developed→Received)
  const allTransitions = await knex("transitions")
    .join("transition_states as fs", "transitions.from_state_id", "fs.id")
    .join("transition_states as ts", "transitions.to_state_id", "ts.id")
    .join("transition_profiles as tp", "transitions.profile_id", "tp.id")
    .select(
      "transitions.id",
      "fs.name as from_name",
      "ts.name as to_name",
      "tp.name as profile_name",
    );

  const transId = (from: string, to: string, profile: string) =>
    allTransitions.find(
      (t) =>
        t.from_name === from && t.to_name === to && t.profile_name === profile,
    )!.id as string;

  const fieldTypes = await knex("transition_metadata_field_types").select(
    "id",
    "name",
  );
  const fieldTypeId = (name: string) =>
    fieldTypes.find((f) => f.name === name)!.id as string;

  const bool = fieldTypeId("boolean");
  const str = fieldTypeId("string");
  const date = fieldTypeId("date");

  const instantReceivedId = transId("Finished", "Received", "instant");

  await knex("transition_metadata").insert([
    {
      transition_id: instantReceivedId,
      field: "scansReceived",
      field_type_id: bool,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: instantReceivedId,
      field: "scansUrl",
      field_type_id: str,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: instantReceivedId,
      field: "negativesReceived",
      field_type_id: bool,
      default_value: null,
      is_required: false,
    },
    {
      transition_id: instantReceivedId,
      field: "negativesDate",
      field_type_id: date,
      default_value: null,
      is_required: false,
    },
  ]);

  // suppress unused var warnings
  void str;
  void date;
  void bool;
}

export async function down(knex: Knex): Promise<void> {
  // Remove instant-profile transitions (metadata cascades via FK)
  const [instantProfile] = await knex("transition_profiles")
    .where("name", "instant")
    .select("id")
    .catch(() => [null]);

  if (instantProfile) {
    await knex("transitions").where("profile_id", instantProfile.id).delete();
  }

  // Remove transition_profile from rolls
  await knex.schema.alterTable("rolls", (t) => {
    t.dropColumn("transition_profile");
  });

  // Drop the profile-scoped unique constraint
  await knex.raw(
    `ALTER TABLE transitions DROP CONSTRAINT transitions_from_state_id_to_state_id_profile_id_unique`,
  );

  // Drop profile_id column (also drops FK constraint)
  await knex.schema.alterTable("transitions", (t) => {
    t.dropColumn("profile_id");
  });

  // Restore original unique constraint
  await knex.schema.alterTable("transitions", (t) => {
    t.unique(["from_state_id", "to_state_id"]);
  });

  await knex.schema.dropTableIfExists("transition_profiles");
}
