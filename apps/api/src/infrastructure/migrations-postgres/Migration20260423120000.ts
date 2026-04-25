import { Migration } from '@mikro-orm/migrations';

export class Migration20260423120000 extends Migration {
  override async up(): Promise<void> {
    // Reference tables
    this.addSql(`create table "development_process" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "development_process" add constraint "development_process_code_unique" unique ("code");`);

    this.addSql(`create table "device_type" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "device_type" add constraint "device_type_code_unique" unique ("code");`);

    this.addSql(`create table "emulsion" ("id" serial primary key, "brand" text not null, "manufacturer" text not null, "iso_speed" int not null, "development_process_id" int not null, "balance" text not null);`);
    this.addSql(`alter table "emulsion" add constraint "emulsion_brand_manufacturer_iso_speed_unique" unique ("brand", "manufacturer", "iso_speed");`);

    this.addSql(`create table "film_format" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "film_format" add constraint "film_format_code_unique" unique ("code");`);

    this.addSql(`create table "emulsion_film_format" ("emulsion_entity_id" int not null, "film_format_entity_id" int not null, primary key ("emulsion_entity_id", "film_format_entity_id"));`);

    this.addSql(`create table "film_state" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "film_state" add constraint "film_state_code_unique" unique ("code");`);

    this.addSql(`create table "holder_type" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "holder_type" add constraint "holder_type_code_unique" unique ("code");`);

    this.addSql(`create table "package_type" ("id" serial primary key, "code" text not null, "label" text not null, "film_format_id" int not null);`);
    this.addSql(`alter table "package_type" add constraint "package_type_film_format_id_code_unique" unique ("film_format_id", "code");`);

    this.addSql(`create table "slot_state" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "slot_state" add constraint "slot_state_code_unique" unique ("code");`);

    this.addSql(`create table "storage_location" ("id" serial primary key, "code" text not null, "label" text not null);`);
    this.addSql(`alter table "storage_location" add constraint "storage_location_code_unique" unique ("code");`);

    // Users and auth
    this.addSql(`create table "user" ("id" serial primary key, "email" text not null, "name" text not null, "password_hash" text not null, "created_at" text not null);`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "refresh_tokens" ("id" serial primary key, "user_id" int not null, "token_hash" text not null, "previous_token_hash" text null, "previous_token_grace_until" text null, "created_at" text not null, "expires_at" text not null, "revoked_at" text null);`);
    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_token_hash_unique" unique ("token_hash");`);

    this.addSql(`create table "idempotency_key" ("id" serial primary key, "user_id" int not null, "scope" text not null, "key" text not null, "request_hash" text not null, "response_body" jsonb not null, "created_at" text not null, "expires_at" text null);`);
    this.addSql(`alter table "idempotency_key" add constraint "idempotency_key_user_id_scope_key_unique" unique ("user_id", "scope", "key");`);

    // Devices (Class Table Inheritance)
    this.addSql(`create table "film_device" ("id" serial primary key, "user_id" int not null, "device_type_id" int not null, "film_format_id" int not null, "frame_size" text not null);`);

    this.addSql(`create table "camera" ("film_device_id" int not null, "make" text not null, "model" text not null, "load_mode" text not null, "can_unload" boolean not null, "camera_system" text null, "serial_number" text null, "date_acquired" text null, primary key ("film_device_id"));`);

    this.addSql(`create table "interchangeable_back" ("film_device_id" int not null, "name" text not null, "system" text not null, primary key ("film_device_id"));`);

    this.addSql(`create table "film_holder" ("film_device_id" int not null, "name" text not null, "brand" text not null, "slot_count" int not null, "holder_type_id" int not null, primary key ("film_device_id"));`);

    this.addSql(`create table "film_holder_slot" ("id" serial primary key, "user_id" int not null, "film_device_id" int not null, "side_number" int not null, "slot_state_id" int not null, "slot_state_code" text not null, "loaded_film_id" int null, "created_at" text not null);`);

    this.addSql(`create table "device_mount" ("id" serial primary key, "user_id" int not null, "camera_device_id" int not null, "mounted_device_id" int not null, "mounted_at" text not null, "unmounted_at" text null);`);

    // Film lots and individual rolls
    this.addSql(`create table "film_lot" ("id" serial primary key, "user_id" int not null, "emulsion_id" int not null, "package_type_id" int not null, "film_format_id" int not null, "quantity" int not null, "expiration_date" text null, "created_at" text not null);`);

    this.addSql(`create table "film" ("id" serial primary key, "user_id" int not null, "film_lot_id" int not null, "name" text not null, "emulsion_id" int not null, "package_type_id" int not null, "film_format_id" int not null, "expiration_date" text null, "current_state_id" int not null, "current_device_id" int null);`);
    this.addSql(`alter table "film" add constraint "film_user_id_name_unique" unique ("user_id", "name");`);

    this.addSql(`create table "film_journey_event" ("id" serial primary key, "film_id" int not null, "user_id" int not null, "film_state_id" int not null, "occurred_at" text not null, "recorded_at" text not null, "notes" text null, "event_data" jsonb not null);`);

    this.addSql(`create table "film_frame" ("id" serial primary key, "user_id" int not null, "film_id" int not null, "frame_number" int not null, "current_state_id" int not null);`);

    this.addSql(`create table "frame_journey_event" ("id" serial primary key, "film_id" int not null, "film_frame_id" int not null, "user_id" int not null, "film_state_id" int not null, "occurred_at" text not null, "recorded_at" text not null, "notes" text null, "event_data" jsonb not null);`);

    // Foreign key constraints
    this.addSql(`alter table "emulsion" add constraint "emulsion_development_process_id_foreign" foreign key ("development_process_id") references "development_process" ("id");`);

    this.addSql(`alter table "emulsion_film_format" add constraint "emulsion_film_format_emulsion_entity_id_foreign" foreign key ("emulsion_entity_id") references "emulsion" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "emulsion_film_format" add constraint "emulsion_film_format_film_format_entity_id_foreign" foreign key ("film_format_entity_id") references "film_format" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "package_type" add constraint "package_type_film_format_id_foreign" foreign key ("film_format_id") references "film_format" ("id");`);

    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "idempotency_key" add constraint "idempotency_key_user_id_foreign" foreign key ("user_id") references "user" ("id");`);

    this.addSql(`alter table "film_device" add constraint "film_device_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film_device" add constraint "film_device_device_type_id_foreign" foreign key ("device_type_id") references "device_type" ("id");`);
    this.addSql(`alter table "film_device" add constraint "film_device_film_format_id_foreign" foreign key ("film_format_id") references "film_format" ("id");`);

    this.addSql(`alter table "camera" add constraint "camera_film_device_id_foreign" foreign key ("film_device_id") references "film_device" ("id") on delete cascade;`);
    this.addSql(`alter table "interchangeable_back" add constraint "interchangeable_back_film_device_id_foreign" foreign key ("film_device_id") references "film_device" ("id") on delete cascade;`);
    this.addSql(`alter table "film_holder" add constraint "film_holder_film_device_id_foreign" foreign key ("film_device_id") references "film_device" ("id") on delete cascade;`);
    this.addSql(`alter table "film_holder" add constraint "film_holder_holder_type_id_foreign" foreign key ("holder_type_id") references "holder_type" ("id");`);

    this.addSql(`alter table "film_holder_slot" add constraint "film_holder_slot_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film_holder_slot" add constraint "film_holder_slot_film_device_id_foreign" foreign key ("film_device_id") references "film_holder" ("film_device_id");`);
    this.addSql(`alter table "film_holder_slot" add constraint "film_holder_slot_slot_state_id_foreign" foreign key ("slot_state_id") references "slot_state" ("id");`);
    this.addSql(`alter table "film_holder_slot" add constraint "film_holder_slot_loaded_film_id_foreign" foreign key ("loaded_film_id") references "film" ("id") on delete set null;`);

    this.addSql(`alter table "device_mount" add constraint "device_mount_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "device_mount" add constraint "device_mount_camera_device_id_foreign" foreign key ("camera_device_id") references "film_device" ("id");`);
    this.addSql(`alter table "device_mount" add constraint "device_mount_mounted_device_id_foreign" foreign key ("mounted_device_id") references "film_device" ("id");`);

    this.addSql(`alter table "film_lot" add constraint "film_lot_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film_lot" add constraint "film_lot_emulsion_id_foreign" foreign key ("emulsion_id") references "emulsion" ("id");`);
    this.addSql(`alter table "film_lot" add constraint "film_lot_package_type_id_foreign" foreign key ("package_type_id") references "package_type" ("id");`);
    this.addSql(`alter table "film_lot" add constraint "film_lot_film_format_id_foreign" foreign key ("film_format_id") references "film_format" ("id");`);

    this.addSql(`alter table "film" add constraint "film_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film" add constraint "film_film_lot_id_foreign" foreign key ("film_lot_id") references "film_lot" ("id");`);
    this.addSql(`alter table "film" add constraint "film_emulsion_id_foreign" foreign key ("emulsion_id") references "emulsion" ("id");`);
    this.addSql(`alter table "film" add constraint "film_package_type_id_foreign" foreign key ("package_type_id") references "package_type" ("id");`);
    this.addSql(`alter table "film" add constraint "film_film_format_id_foreign" foreign key ("film_format_id") references "film_format" ("id");`);
    this.addSql(`alter table "film" add constraint "film_current_state_id_foreign" foreign key ("current_state_id") references "film_state" ("id");`);
    this.addSql(`alter table "film" add constraint "film_current_device_id_foreign" foreign key ("current_device_id") references "film_device" ("id");`);

    this.addSql(`alter table "film_journey_event" add constraint "film_journey_event_film_id_foreign" foreign key ("film_id") references "film" ("id");`);
    this.addSql(`alter table "film_journey_event" add constraint "film_journey_event_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film_journey_event" add constraint "film_journey_event_film_state_id_foreign" foreign key ("film_state_id") references "film_state" ("id");`);

    this.addSql(`alter table "film_frame" add constraint "film_frame_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "film_frame" add constraint "film_frame_film_id_foreign" foreign key ("film_id") references "film" ("id");`);
    this.addSql(`alter table "film_frame" add constraint "film_frame_current_state_id_foreign" foreign key ("current_state_id") references "film_state" ("id");`);

    this.addSql(`alter table "frame_journey_event" add constraint "frame_journey_event_film_id_foreign" foreign key ("film_id") references "film" ("id");`);
    this.addSql(`alter table "frame_journey_event" add constraint "frame_journey_event_film_frame_id_foreign" foreign key ("film_frame_id") references "film_frame" ("id");`);
    this.addSql(`alter table "frame_journey_event" add constraint "frame_journey_event_user_id_foreign" foreign key ("user_id") references "user" ("id");`);
    this.addSql(`alter table "frame_journey_event" add constraint "frame_journey_event_film_state_id_foreign" foreign key ("film_state_id") references "film_state" ("id");`);
  }
}
