import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Add parent_roll_id FK to rolls (self-referential, nullable)
  await knex.schema.alterTable("rolls", (t) => {
    t.uuid("parent_roll_id")
      .nullable()
      .references("id")
      .inTable("rolls")
      .onDelete("SET NULL");
  });

  // 2. Add 'bulk' transition profile
  await knex("transition_profiles").insert({ name: "bulk" });

  // 3. Seed bulk transitions
  const profiles = await knex("transition_profiles").select("id", "name");
  const bulkId = profiles.find((p) => p.name === "bulk")!.id as string;

  const states = await knex("transition_states").select("id", "name");
  const stateId = (name: string) =>
    states.find((s) => s.name === name)!.id as string;

  const types = await knex("transition_types").select("id", "name");
  const typeId = (name: string) =>
    types.find((t) => t.name === name)!.id as string;

  const fwd = typeId("FORWARD");
  const bwd = typeId("BACKWARD");

  // Bulk profile: storage + loading states, ends at Finished (no lab chain)
  // Forward: Added → Frozen/Refrigerated/Shelved, cross-storage, Shelved → Loaded, Loaded → Finished
  // Backward: same as standard up to Finished
  const bulkTransitions: {
    from_state_id: string;
    to_state_id: string;
    transition_type_id: string;
    requires_date: boolean;
    profile_id: string;
  }[] = [
    // FORWARD — storage
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Frozen"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Added"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Shelved"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    // FORWARD — loading and exhaustion
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Loaded"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Finished"),
      transition_type_id: fwd,
      requires_date: true,
      profile_id: bulkId,
    },
    // BACKWARD
    {
      from_state_id: stateId("Frozen"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Refrigerated"),
      to_state_id: stateId("Added"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Shelved"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Shelved"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Refrigerated"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Loaded"),
      to_state_id: stateId("Frozen"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
    {
      from_state_id: stateId("Finished"),
      to_state_id: stateId("Loaded"),
      transition_type_id: bwd,
      requires_date: false,
      profile_id: bulkId,
    },
  ];

  await knex("transitions").insert(bulkTransitions);
}

export async function down(knex: Knex): Promise<void> {
  // Remove parent_roll_id from rolls
  await knex.schema.alterTable("rolls", (t) => {
    t.dropColumn("parent_roll_id");
  });

  // Remove bulk-profile transitions (metadata would cascade)
  const bulkProfile = await knex("transition_profiles")
    .where("name", "bulk")
    .first()
    .catch(() => null);

  if (bulkProfile) {
    await knex("transitions").where("profile_id", bulkProfile.id).delete();
    await knex("transition_profiles").where("name", "bulk").delete();
  }
}
