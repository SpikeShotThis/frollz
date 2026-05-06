import { Migration } from '@mikro-orm/migrations';

export class Migration20260505120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fl.user_id,
        'lab_name',
        MIN(TRIM(fl.name)) AS value,
        LOWER(TRIM(fl.name)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_lab fl
      WHERE TRIM(COALESCE(fl.name, '')) <> ''
      GROUP BY fl.user_id, LOWER(TRIM(fl.name));
    `);

    this.addSql(`
      INSERT OR IGNORE INTO reference_value (user_id, kind, value, normalized_value, usage_count, last_used_at)
      SELECT
        fl.user_id,
        'lab_contact',
        MIN(TRIM(fl.contact)) AS value,
        LOWER(TRIM(fl.contact)) AS normalized_value,
        COUNT(*) AS usage_count,
        datetime('now') AS last_used_at
      FROM film_lab fl
      WHERE TRIM(COALESCE(fl.contact, '')) <> ''
      GROUP BY fl.user_id, LOWER(TRIM(fl.contact));
    `);
  }

  override async down(): Promise<void> {
    // One-time backfill migration; no rollback needed.
  }
}
