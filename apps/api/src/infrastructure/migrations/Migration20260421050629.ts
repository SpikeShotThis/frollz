import { Migration } from '@mikro-orm/migrations';

export class Migration20260421050629 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`development_process\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`development_process_code_unique\` on \`development_process\` (\`code\`);`);

    this.addSql(`create table \`emulsion\` (\`id\` integer not null primary key autoincrement, \`brand\` text not null, \`manufacturer\` text not null, \`iso_speed\` integer not null, \`development_process_id\` integer not null, \`balance\` text not null, constraint \`emulsion_development_process_id_foreign\` foreign key(\`development_process_id\`) references \`development_process\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`emulsion_development_process_id_index\` on \`emulsion\` (\`development_process_id\`);`);
    this.addSql(`create unique index \`emulsion_brand_manufacturer_iso_speed_unique\` on \`emulsion\` (\`brand\`, \`manufacturer\`, \`iso_speed\`);`);

    this.addSql(`create table \`film_format\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`film_format_code_unique\` on \`film_format\` (\`code\`);`);

    this.addSql(`create table \`emulsion_film_format\` (\`emulsion_entity_id\` integer not null, \`film_format_entity_id\` integer not null, constraint \`emulsion_film_format_emulsion_entity_id_foreign\` foreign key(\`emulsion_entity_id\`) references \`emulsion\`(\`id\`) on delete cascade on update cascade, constraint \`emulsion_film_format_film_format_entity_id_foreign\` foreign key(\`film_format_entity_id\`) references \`film_format\`(\`id\`) on delete cascade on update cascade, primary key (\`emulsion_entity_id\`, \`film_format_entity_id\`));`);
    this.addSql(`create index \`emulsion_film_format_emulsion_entity_id_index\` on \`emulsion_film_format\` (\`emulsion_entity_id\`);`);
    this.addSql(`create index \`emulsion_film_format_film_format_entity_id_index\` on \`emulsion_film_format\` (\`film_format_entity_id\`);`);

    this.addSql(`create table \`film_state\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`film_state_code_unique\` on \`film_state\` (\`code\`);`);

    this.addSql(`create table \`holder_type\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`holder_type_code_unique\` on \`holder_type\` (\`code\`);`);

    this.addSql(`create table \`package_type\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null, \`film_format_id\` integer not null, constraint \`package_type_film_format_id_foreign\` foreign key(\`film_format_id\`) references \`film_format\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`package_type_film_format_id_index\` on \`package_type\` (\`film_format_id\`);`);
    this.addSql(`create unique index \`package_type_film_format_id_code_unique\` on \`package_type\` (\`film_format_id\`, \`code\`);`);

    this.addSql(`create table \`receiver_type\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`receiver_type_code_unique\` on \`receiver_type\` (\`code\`);`);

    this.addSql(`create table \`slot_state\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`slot_state_code_unique\` on \`slot_state\` (\`code\`);`);

    this.addSql(`create table \`storage_location\` (\`id\` integer not null primary key autoincrement, \`code\` text not null, \`label\` text not null);`);
    this.addSql(`create unique index \`storage_location_code_unique\` on \`storage_location\` (\`code\`);`);

    this.addSql(`create table \`user\` (\`id\` integer not null primary key autoincrement, \`email\` text not null, \`name\` text not null, \`password_hash\` text not null, \`created_at\` text not null);`);
    this.addSql(`create unique index \`user_email_unique\` on \`user\` (\`email\`);`);

    this.addSql(`create table \`refresh_tokens\` (\`id\` integer not null primary key autoincrement, \`user_id\` integer not null, \`token_hash\` text not null, \`created_at\` text not null, \`expires_at\` text not null, constraint \`refresh_tokens_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`refresh_tokens_user_id_index\` on \`refresh_tokens\` (\`user_id\`);`);
    this.addSql(`create unique index \`refresh_tokens_token_hash_unique\` on \`refresh_tokens\` (\`token_hash\`);`);

    this.addSql(`create table \`film_receiver\` (\`id\` integer not null primary key autoincrement, \`user_id\` integer not null, \`receiver_type_id\` integer not null, \`film_format_id\` integer not null, \`frame_size\` text not null, constraint \`film_receiver_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on update cascade, constraint \`film_receiver_receiver_type_id_foreign\` foreign key(\`receiver_type_id\`) references \`receiver_type\`(\`id\`) on update cascade, constraint \`film_receiver_film_format_id_foreign\` foreign key(\`film_format_id\`) references \`film_format\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`film_receiver_user_id_index\` on \`film_receiver\` (\`user_id\`);`);
    this.addSql(`create index \`film_receiver_receiver_type_id_index\` on \`film_receiver\` (\`receiver_type_id\`);`);
    this.addSql(`create index \`film_receiver_film_format_id_index\` on \`film_receiver\` (\`film_format_id\`);`);

    this.addSql(`create table \`interchangeable_back\` (\`film_receiver_id\` integer not null, \`name\` text not null, \`system\` text not null, constraint \`interchangeable_back_film_receiver_id_foreign\` foreign key(\`film_receiver_id\`) references \`film_receiver\`(\`id\`) on delete cascade on update cascade, primary key (\`film_receiver_id\`));`);

    this.addSql(`create table \`film_holder\` (\`film_receiver_id\` integer not null, \`name\` text not null, \`brand\` text not null, \`holder_type_id\` integer not null, constraint \`film_holder_film_receiver_id_foreign\` foreign key(\`film_receiver_id\`) references \`film_receiver\`(\`id\`) on delete cascade on update cascade, constraint \`film_holder_holder_type_id_foreign\` foreign key(\`holder_type_id\`) references \`holder_type\`(\`id\`) on update cascade, primary key (\`film_receiver_id\`));`);
    this.addSql(`create index \`film_holder_holder_type_id_index\` on \`film_holder\` (\`holder_type_id\`);`);

    this.addSql(`create table \`camera\` (\`film_receiver_id\` integer not null, \`make\` text not null, \`model\` text not null, \`serial_number\` text null, \`date_acquired\` text null, constraint \`camera_film_receiver_id_foreign\` foreign key(\`film_receiver_id\`) references \`film_receiver\`(\`id\`) on delete cascade on update cascade, primary key (\`film_receiver_id\`));`);

    this.addSql(`create table \`film\` (\`id\` integer not null primary key autoincrement, \`user_id\` integer not null, \`name\` text not null, \`emulsion_id\` integer not null, \`package_type_id\` integer not null, \`film_format_id\` integer not null, \`expiration_date\` text null, \`current_state_id\` integer not null, constraint \`film_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on update cascade, constraint \`film_emulsion_id_foreign\` foreign key(\`emulsion_id\`) references \`emulsion\`(\`id\`) on update cascade, constraint \`film_package_type_id_foreign\` foreign key(\`package_type_id\`) references \`package_type\`(\`id\`) on update cascade, constraint \`film_film_format_id_foreign\` foreign key(\`film_format_id\`) references \`film_format\`(\`id\`) on update cascade, constraint \`film_current_state_id_foreign\` foreign key(\`current_state_id\`) references \`film_state\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`film_user_id_index\` on \`film\` (\`user_id\`);`);
    this.addSql(`create index \`film_emulsion_id_index\` on \`film\` (\`emulsion_id\`);`);
    this.addSql(`create index \`film_package_type_id_index\` on \`film\` (\`package_type_id\`);`);
    this.addSql(`create index \`film_film_format_id_index\` on \`film\` (\`film_format_id\`);`);
    this.addSql(`create index \`film_current_state_id_index\` on \`film\` (\`current_state_id\`);`);
    this.addSql(`create unique index \`film_user_id_name_unique\` on \`film\` (\`user_id\`, \`name\`);`);

    this.addSql(`create table \`film_journey_event\` (\`id\` integer not null primary key autoincrement, \`film_id\` integer not null, \`user_id\` integer not null, \`film_state_id\` integer not null, \`occurred_at\` text not null, \`recorded_at\` text not null, \`notes\` text null, \`event_data\` json not null, constraint \`film_journey_event_film_id_foreign\` foreign key(\`film_id\`) references \`film\`(\`id\`) on update cascade, constraint \`film_journey_event_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on update cascade, constraint \`film_journey_event_film_state_id_foreign\` foreign key(\`film_state_id\`) references \`film_state\`(\`id\`) on update cascade);`);
    this.addSql(`create index \`film_journey_event_film_id_index\` on \`film_journey_event\` (\`film_id\`);`);
    this.addSql(`create index \`film_journey_event_user_id_index\` on \`film_journey_event\` (\`user_id\`);`);
    this.addSql(`create index \`film_journey_event_film_state_id_index\` on \`film_journey_event\` (\`film_state_id\`);`);

    this.addSql(`create table \`film_holder_slot\` (\`id\` integer not null primary key autoincrement, \`user_id\` integer not null, \`film_receiver_id\` integer not null, \`side_number\` integer not null, \`slot_state_id\` integer not null, \`slot_state_code\` text not null, \`loaded_film_id\` integer null, \`created_at\` text not null, constraint \`film_holder_slot_user_id_foreign\` foreign key(\`user_id\`) references \`user\`(\`id\`) on update cascade, constraint \`film_holder_slot_film_receiver_id_foreign\` foreign key(\`film_receiver_id\`) references \`film_holder\`(\`film_receiver_id\`) on update cascade, constraint \`film_holder_slot_slot_state_id_foreign\` foreign key(\`slot_state_id\`) references \`slot_state\`(\`id\`) on update cascade, constraint \`film_holder_slot_loaded_film_id_foreign\` foreign key(\`loaded_film_id\`) references \`film\`(\`id\`) on delete set null on update cascade);`);
    this.addSql(`create index \`film_holder_slot_user_id_index\` on \`film_holder_slot\` (\`user_id\`);`);
    this.addSql(`create index \`film_holder_slot_film_receiver_id_index\` on \`film_holder_slot\` (\`film_receiver_id\`);`);
    this.addSql(`create index \`film_holder_slot_slot_state_id_index\` on \`film_holder_slot\` (\`slot_state_id\`);`);
    this.addSql(`create index \`film_holder_slot_loaded_film_id_index\` on \`film_holder_slot\` (\`loaded_film_id\`);`);
  }

}
