import { Migration } from '@mikro-orm/migrations';

export class Migration20260424200000 extends Migration {
  override async up(): Promise<void> {
    // Idempotency key TTL
    this.addSql(`ALTER TABLE idempotency_key ADD COLUMN expires_at TEXT;`);
    this.addSql(`UPDATE idempotency_key SET expires_at = datetime(created_at, '+24 hours') WHERE expires_at IS NULL;`);

    // Film current device denormalization to replace full-table-scan in findOccupiedFilmForDeviceId
    this.addSql(`ALTER TABLE film ADD COLUMN current_device_id INTEGER REFERENCES film_device(id);`);
  }

  override async down(): Promise<void> {
    // SQLite does not support DROP COLUMN natively before 3.35; recreate tables to reverse.
    // For simplicity this down migration is a no-op — apply schema changes manually if needed.
  }
}
