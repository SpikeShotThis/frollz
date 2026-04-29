import { Migration } from '@mikro-orm/migrations';

export class Migration20260429170000 extends Migration {
  override async up(): Promise<void> {
    const hasSupplierNameColumn = await this.execute(`
      SELECT COUNT(*) as count FROM pragma_table_info('film_lot') WHERE name = 'supplier_name'
    `);

    if ((hasSupplierNameColumn[0] ?? { count: 0 }).count === 0) {
      return;
    }

    this.addSql(`
      INSERT OR IGNORE INTO "film_supplier" ("user_id", "name", "normalized_name", "contact", "email", "website", "notes", "active", "rating")
      SELECT DISTINCT
        "fl"."user_id",
        trim("fl"."supplier_name"),
        lower(trim("fl"."supplier_name")),
        null,
        null,
        null,
        null,
        1,
        null
      FROM "film_lot" "fl"
      WHERE "fl"."supplier_name" IS NOT NULL AND length(trim("fl"."supplier_name")) > 0;
    `);

    this.addSql(`
      UPDATE "film_lot"
      SET "supplier_id" = (
        SELECT "fs"."id"
        FROM "film_supplier" "fs"
        WHERE "fs"."user_id" = "film_lot"."user_id"
          AND "fs"."normalized_name" = lower(trim("film_lot"."supplier_name"))
        LIMIT 1
      )
      WHERE "supplier_id" IS NULL
        AND "supplier_name" IS NOT NULL
        AND length(trim("supplier_name")) > 0;
    `);

    this.addSql('alter table "film_lot" drop column "supplier_name";');
  }

  override async down(): Promise<void> {
    // Intentional no-op.
  }
}
