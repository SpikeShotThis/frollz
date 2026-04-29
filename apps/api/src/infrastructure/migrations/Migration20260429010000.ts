import { Migration } from '@mikro-orm/migrations';

export class Migration20260429010000 extends Migration {
  override async up(): Promise<void> {
    // Emulsion-derived values should be user-scoped via film lots, not global emulsion catalog rows.
    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fl.user_id,
        'manufacturer',
        MIN(TRIM(e.manufacturer)) AS value,
        LOWER(TRIM(e.manufacturer)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_lot fl
      JOIN emulsion e ON e.id = fl.emulsion_id
      WHERE TRIM(COALESCE(e.manufacturer, '')) <> ''
      GROUP BY fl.user_id, LOWER(TRIM(e.manufacturer));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fl.user_id,
        'brand',
        MIN(TRIM(e.brand)) AS value,
        LOWER(TRIM(e.brand)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_lot fl
      JOIN emulsion e ON e.id = fl.emulsion_id
      WHERE TRIM(COALESCE(e.brand, '')) <> ''
      GROUP BY fl.user_id, LOWER(TRIM(e.brand));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fd.user_id,
        'device_make',
        MIN(TRIM(c.make)) AS value,
        LOWER(TRIM(c.make)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_device fd
      JOIN camera c ON c.film_device_id = fd.id
      WHERE TRIM(COALESCE(c.make, '')) <> ''
      GROUP BY fd.user_id, LOWER(TRIM(c.make));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fd.user_id,
        'device_model',
        MIN(TRIM(c.model)) AS value,
        LOWER(TRIM(c.model)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_device fd
      JOIN camera c ON c.film_device_id = fd.id
      WHERE TRIM(COALESCE(c.model, '')) <> ''
      GROUP BY fd.user_id, LOWER(TRIM(c.model));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fd.user_id,
        'device_system',
        MIN(TRIM(ib.system)) AS value,
        LOWER(TRIM(ib.system)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_device fd
      JOIN interchangeable_back ib ON ib.film_device_id = fd.id
      WHERE TRIM(COALESCE(ib.system, '')) <> ''
      GROUP BY fd.user_id, LOWER(TRIM(ib.system));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fd.user_id,
        'brand',
        MIN(TRIM(fh.brand)) AS value,
        LOWER(TRIM(fh.brand)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_device fd
      JOIN film_holder fh ON fh.film_device_id = fd.id
      WHERE TRIM(COALESCE(fh.brand, '')) <> ''
      GROUP BY fd.user_id, LOWER(TRIM(fh.brand));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fje.user_id,
        'lab_name',
        MIN(TRIM(json_extract(fje.event_data, '$.labName'))) AS value,
        LOWER(TRIM(json_extract(fje.event_data, '$.labName'))) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_journey_event fje
      WHERE TRIM(COALESCE(json_extract(fje.event_data, '$.labName'), '')) <> ''
      GROUP BY fje.user_id, LOWER(TRIM(json_extract(fje.event_data, '$.labName')));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fje.user_id,
        'lab_contact',
        MIN(TRIM(json_extract(fje.event_data, '$.labContact'))) AS value,
        LOWER(TRIM(json_extract(fje.event_data, '$.labContact'))) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_journey_event fje
      WHERE TRIM(COALESCE(json_extract(fje.event_data, '$.labContact'), '')) <> ''
      GROUP BY fje.user_id, LOWER(TRIM(json_extract(fje.event_data, '$.labContact')));
    `);
  }

  override async down(): Promise<void> {
    // One-time backfill migration; no rollback needed.
  }
}
