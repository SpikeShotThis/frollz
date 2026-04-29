import { Migration } from '@mikro-orm/migrations';

export class Migration20260429170000 extends Migration {
  override async up(): Promise<void> {
    const hasSupplierNameColumn = await this.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'film_lot' AND column_name = 'supplier_name'
    `);

    if (hasSupplierNameColumn.length === 0) {
      return;
    }

    this.addSql(`
      INSERT INTO "film_supplier" ("user_id", "name", "normalized_name", "contact", "email", "website", "notes", "active", "rating")
      SELECT DISTINCT
        "fl"."user_id",
        trim("fl"."supplier_name"),
        lower(trim("fl"."supplier_name")),
        null,
        null,
        null,
        null,
        true,
        null
      FROM "film_lot" "fl"
      WHERE "fl"."supplier_name" IS NOT NULL AND length(trim("fl"."supplier_name")) > 0
      ON CONFLICT ("user_id", "normalized_name") DO NOTHING;
    `);

    this.addSql(`
      UPDATE "film_lot" "fl"
      SET "supplier_id" = "fs"."id"
      FROM "film_supplier" "fs"
      WHERE "fl"."supplier_id" IS NULL
        AND "fl"."supplier_name" IS NOT NULL
        AND length(trim("fl"."supplier_name")) > 0
        AND "fs"."user_id" = "fl"."user_id"
        AND "fs"."normalized_name" = lower(trim("fl"."supplier_name"));
    `);

    this.addSql('alter table "film_lot" drop column if exists "supplier_name";');
  }

  override async down(): Promise<void> {
    // Intentional no-op.
  }
}
