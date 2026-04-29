import { Migration } from '@mikro-orm/migrations';

export class Migration20260429010000 extends Migration {
  override async up(): Promise<void> {
    // Emulsion-derived values should be user-scoped via film lots, not global emulsion catalog rows.
    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fl."user_id",
        'manufacturer',
        MIN(BTRIM(e."manufacturer")) AS value,
        LOWER(BTRIM(e."manufacturer")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_lot" fl
      JOIN "emulsion" e ON e."id" = fl."emulsion_id"
      WHERE BTRIM(COALESCE(e."manufacturer", '')) <> ''
      GROUP BY fl."user_id", LOWER(BTRIM(e."manufacturer"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fl."user_id",
        'brand',
        MIN(BTRIM(e."brand")) AS value,
        LOWER(BTRIM(e."brand")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_lot" fl
      JOIN "emulsion" e ON e."id" = fl."emulsion_id"
      WHERE BTRIM(COALESCE(e."brand", '')) <> ''
      GROUP BY fl."user_id", LOWER(BTRIM(e."brand"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fd."user_id",
        'device_make',
        MIN(BTRIM(c."make")) AS value,
        LOWER(BTRIM(c."make")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_device" fd
      JOIN "camera" c ON c."film_device_id" = fd."id"
      WHERE BTRIM(COALESCE(c."make", '')) <> ''
      GROUP BY fd."user_id", LOWER(BTRIM(c."make"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fd."user_id",
        'device_model',
        MIN(BTRIM(c."model")) AS value,
        LOWER(BTRIM(c."model")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_device" fd
      JOIN "camera" c ON c."film_device_id" = fd."id"
      WHERE BTRIM(COALESCE(c."model", '')) <> ''
      GROUP BY fd."user_id", LOWER(BTRIM(c."model"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fd."user_id",
        'device_system',
        MIN(BTRIM(ib."system")) AS value,
        LOWER(BTRIM(ib."system")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_device" fd
      JOIN "interchangeable_back" ib ON ib."film_device_id" = fd."id"
      WHERE BTRIM(COALESCE(ib."system", '')) <> ''
      GROUP BY fd."user_id", LOWER(BTRIM(ib."system"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fd."user_id",
        'brand',
        MIN(BTRIM(fh."brand")) AS value,
        LOWER(BTRIM(fh."brand")) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_device" fd
      JOIN "film_holder" fh ON fh."film_device_id" = fd."id"
      WHERE BTRIM(COALESCE(fh."brand", '')) <> ''
      GROUP BY fd."user_id", LOWER(BTRIM(fh."brand"))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fje."user_id",
        'lab_name',
        MIN(BTRIM(fje."event_data"->>'labName')) AS value,
        LOWER(BTRIM(fje."event_data"->>'labName')) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_journey_event" fje
      WHERE BTRIM(COALESCE(fje."event_data"->>'labName', '')) <> ''
      GROUP BY fje."user_id", LOWER(BTRIM(fje."event_data"->>'labName'))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);

    this.addSql(`
      INSERT INTO "reference_value" ("user_id", "kind", "value", "normalized_value", "usage_count", "last_used_at")
      SELECT
        fje."user_id",
        'lab_contact',
        MIN(BTRIM(fje."event_data"->>'labContact')) AS value,
        LOWER(BTRIM(fje."event_data"->>'labContact')) AS normalized_value,
        COUNT(*)::int AS usage_count,
        now()::text AS last_used_at
      FROM "film_journey_event" fje
      WHERE BTRIM(COALESCE(fje."event_data"->>'labContact', '')) <> ''
      GROUP BY fje."user_id", LOWER(BTRIM(fje."event_data"->>'labContact'))
      ON CONFLICT ("user_id", "kind", "normalized_value") DO NOTHING;
    `);
  }

  override async down(): Promise<void> {
    // One-time backfill migration; no rollback needed.
  }
}
