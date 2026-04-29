import { Migration } from '@mikro-orm/migrations';

export class Migration20260426000000 extends Migration {
  override async up(): Promise<void> {
    // 1. Create film_lot with a temporary _film_id column for backfill correlation
    this.addSql(`
      CREATE TABLE "film_lot" (
        "id" serial primary key,
        "_film_id" int,
        "user_id" int not null references "user"("id"),
        "emulsion_id" int not null references "emulsion"("id"),
        "package_type_id" int not null references "package_type"("id"),
        "film_format_id" int not null references "film_format"("id"),
        "quantity" int not null default 1,
        "expiration_date" text,
        "created_at" text not null
      );
    `);

    // 2. Backfill one lot per existing film (quantity=1 for all legacy data)
    this.addSql(`
      INSERT INTO "film_lot" ("_film_id", "user_id", "emulsion_id", "package_type_id", "film_format_id",
                              "quantity", "expiration_date", "created_at")
      SELECT "id", "user_id", "emulsion_id", "package_type_id", "film_format_id",
             1, "expiration_date", now()::text
      FROM "film" ORDER BY "id";
    `);

    // 3. Add film_lot_id to film and backfill via the temp column
    this.addSql(`ALTER TABLE "film" ADD COLUMN "film_lot_id" int references "film_lot"("id");`);
    this.addSql(`
      UPDATE "film" SET "film_lot_id" = (
        SELECT "fl"."id" FROM "film_lot" "fl" WHERE "fl"."_film_id" = "film"."id"
      );
    `);
    this.addSql(`ALTER TABLE "film_lot" DROP COLUMN "_film_id";`);

    // 4. Recreate film_frame: replace film_stock_id + legacy_film_id with film_id,
    //    drop bound_holder_device_id, bound_holder_slot_number, first_loaded_at
    this.addSql(`
      CREATE TABLE "film_frame_new" (
        "id" serial primary key,
        "user_id" int not null references "user"("id"),
        "film_id" int not null references "film"("id"),
        "frame_number" int not null,
        "current_state_id" int not null references "film_state"("id")
      );
    `);
    this.addSql(`
      INSERT INTO "film_frame_new" ("id", "user_id", "film_id", "frame_number", "current_state_id")
      SELECT "id", "user_id", "legacy_film_id", "frame_number", "current_state_id"
      FROM "film_frame"
      WHERE "legacy_film_id" IS NOT NULL;
    `);

    // Drop foreign keys referencing film_frame before dropping it
    this.addSql(`ALTER TABLE "frame_journey_event" DROP CONSTRAINT IF EXISTS "frame_journey_event_film_frame_id_foreign";`);
    this.addSql(`DROP TABLE "film_frame";`);
    this.addSql(`ALTER TABLE "film_frame_new" RENAME TO "film_frame";`);
    this.addSql(`CREATE INDEX "film_frame_film_id_index" ON "film_frame" ("film_id");`);

    // Re-add the foreign key from frame_journey_event to the new film_frame
    this.addSql(`ALTER TABLE "frame_journey_event" ADD CONSTRAINT "frame_journey_event_film_frame_id_foreign" FOREIGN KEY ("film_frame_id") REFERENCES "film_frame" ("id");`);

    // Sync the serial sequence to avoid collisions after copying explicit IDs
    this.addSql(`SELECT setval(pg_get_serial_sequence('"film_frame"', 'id'), COALESCE(MAX("id"), 1)) FROM "film_frame";`);

    // 5. Drop the now-orphaned film_stock table
    this.addSql(`DROP TABLE IF EXISTS "film_stock";`);
  }

  override async down(): Promise<void> {
    // Intentional no-op — reversing this migration requires restoring from backup.
  }
}
