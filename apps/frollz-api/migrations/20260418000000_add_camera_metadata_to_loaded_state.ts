import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex("transition_metadata_field").insert([
    { name: "cameraId", field_type: "camera", allow_multiple: false },
  ]);

  const loadedState = await knex<{ id: number }>("transition_state")
    .where({ name: "Loaded" })
    .first();
  if (!loadedState) throw new Error("Migration error: 'Loaded' transition_state not found");

  const field = await knex<{ id: number }>("transition_metadata_field")
    .where({ name: "cameraId" })
    .first();
  if (!field) throw new Error("Migration error: 'cameraId' transition_metadata_field not found");

  await knex("transition_state_metadata").insert([
    { field_id: field.id, transition_state_id: loadedState.id, default_value: null },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  const field = await knex<{ id: number }>("transition_metadata_field")
    .where({ name: "cameraId" })
    .first();
  if (!field) return;

  await knex("transition_state_metadata").where({ field_id: field.id }).delete();
  await knex("transition_metadata_field").where({ name: "cameraId" }).delete();
}
