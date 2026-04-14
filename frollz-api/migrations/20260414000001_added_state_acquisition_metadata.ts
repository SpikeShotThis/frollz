import type { Knex } from "knex";

// Adds acquisition metadata fields (dateObtained, obtainmentMethod, obtainedFrom)
// to the "Added" transition state.
//
// These fields were previously modelled as static columns on the roll entity in
// the old architecture. They are now captured as transition metadata on the
// initial "Added" state, consistent with how all other state-specific data is
// stored in this system.

export async function up(knex: Knex): Promise<void> {
  await knex("transition_metadata_field").insert([
    { name: "dateObtained",     field_type: "date",   allow_multiple: false },
    { name: "obtainmentMethod", field_type: "string", allow_multiple: false },
    { name: "obtainedFrom",     field_type: "string", allow_multiple: false },
  ]);

  const addedState = await knex<{ id: number }>("transition_state")
    .where({ name: "Added" })
    .first();
  if (!addedState) throw new Error("Migration error: 'Added' transition_state not found");

  const fields = await knex<{ id: number; name: string }>("transition_metadata_field")
    .whereIn("name", ["dateObtained", "obtainmentMethod", "obtainedFrom"])
    .select("id", "name");
  const fieldId = (name: string) => {
    const row = fields.find((f) => f.name === name);
    if (!row) throw new Error(`Migration error: transition_metadata_field '${name}' not found`);
    return row.id;
  };

  await knex("transition_state_metadata").insert([
    { field_id: fieldId("dateObtained"),     transition_state_id: addedState.id, default_value: null },
    { field_id: fieldId("obtainmentMethod"), transition_state_id: addedState.id, default_value: null },
    { field_id: fieldId("obtainedFrom"),     transition_state_id: addedState.id, default_value: null },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  const fields = await knex<{ id: number }>("transition_metadata_field")
    .whereIn("name", ["dateObtained", "obtainmentMethod", "obtainedFrom"])
    .select("id");
  const ids = fields.map((f) => f.id);

  await knex("transition_state_metadata").whereIn("field_id", ids).delete();
  await knex("transition_metadata_field")
    .whereIn("name", ["dateObtained", "obtainmentMethod", "obtainedFrom"])
    .delete();
}
