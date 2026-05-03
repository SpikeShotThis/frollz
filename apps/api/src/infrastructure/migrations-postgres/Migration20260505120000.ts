import { Migration } from '@mikro-orm/migrations';

export class Migration20260505120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fl."user_id",
        'lab_name',
        MIN(BTRIM(fl."name")) AS value,
        LOWER(BTRIM(fl."name")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_lab" fl
      WHERE BTRIM(COALESCE(fl."name", '')) <> ''
      GROUP BY fl."user_id", LOWER(BTRIM(fl."name"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fl."user_id",
        'lab_contact',
        MIN(BTRIM(fl."contact")) AS value,
        LOWER(BTRIM(fl."contact")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_lab" fl
      WHERE BTRIM(COALESCE(fl."contact", '')) <> ''
      GROUP BY fl."user_id", LOWER(BTRIM(fl."contact"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);
  }

  override async down(): Promise<void> {
    // One-time backfill migration; no rollback needed.
  }
}
