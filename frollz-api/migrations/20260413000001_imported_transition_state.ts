import type { Knex } from "knex";

// Adds the "Imported" transition state — an entry-only state used by the CSV
// import feature. Films created via CSV import land here instead of "Added",
// making their provenance clear. Rules are added FROM "Imported" to every
// other existing state for all three profiles so users can transition the film
// to wherever it actually is after import.
// No rules point TO "Imported" — it is entry-only.

export async function up(knex: Knex): Promise<void> {
  await knex("transition_state").insert({ name: "Imported" });

  const allStates = await knex<{ id: number; name: string }>("transition_state").select("id", "name");
  const stateId = (name: string) => {
    const row = allStates.find((s) => s.name === name);
    if (!row) throw new Error(`Seed error: transition_state '${name}' not found`);
    return row.id;
  };

  const allProfiles = await knex<{ id: number; name: string }>("transition_profile").select("id", "name");
  const profileId = (name: string) => {
    const row = allProfiles.find((p) => p.name === name);
    if (!row) throw new Error(`Seed error: transition_profile '${name}' not found`);
    return row.id;
  };

  const std = profileId("standard");
  const inst = profileId("instant");
  const bulk = profileId("bulk");

  const otherStates = [
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

  type RuleRow = { from_state_id: number; to_state_id: number; profile_id: number };

  const rules: RuleRow[] = [];
  for (const profile of [std, inst, bulk]) {
    for (const toState of otherStates) {
      rules.push({ from_state_id: stateId("Imported"), to_state_id: stateId(toState), profile_id: profile });
    }
  }

  await knex("transition_rule").insert(rules);
}

export async function down(knex: Knex): Promise<void> {
  const state = await knex<{ id: number }>("transition_state").where({ name: "Imported" }).first();
  if (!state) return;

  await knex("transition_rule")
    .where({ from_state_id: state.id })
    .orWhere({ to_state_id: state.id })
    .delete();

  await knex("transition_state").where({ name: "Imported" }).delete();
}
