import { Migration } from "@mikro-orm/migrations";

export class Migration20260426000000 extends Migration {
  override async up(): Promise<void> {
    // Check if film already has film_lot_id (meaning initial schema is already correct)
    const filmHasLotId = await this.execute(`
      SELECT COUNT(*) as count FROM pragma_table_info('film') WHERE name = 'film_lot_id'
    `);

    // If film already has film_lot_id, the schema is already at target state (clean install)
    if ((filmHasLotId[0] ?? { count: 0 }).count > 0) {
      console.log(
        "Migration20260426000000: Schema already at target state, skipping",
      );
      return;
    }

    // Otherwise, perform the migration from old schema to new schema

    // Drop and recreate film_lot with temporary _film_id column for backfill
    this.addSql(`DROP TABLE IF EXISTS film_lot;`);

    // 1. Create film_lot with a temporary _film_id column for backfill correlation
    this.addSql(`
      CREATE TABLE film_lot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        _film_id INTEGER,
        user_id INTEGER NOT NULL REFERENCES user(id),
        emulsion_id INTEGER NOT NULL REFERENCES emulsion(id),
        package_type_id INTEGER NOT NULL REFERENCES package_type(id),
        film_format_id INTEGER NOT NULL REFERENCES film_format(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        expiration_date TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 2. Backfill one lot per existing film (quantity=1 for all legacy data)
    this.addSql(`
      INSERT INTO film_lot (_film_id, user_id, emulsion_id, package_type_id, film_format_id,
                            quantity, expiration_date, created_at)
      SELECT id, user_id, emulsion_id, package_type_id, film_format_id,
             1, expiration_date, datetime('now')
      FROM film ORDER BY id;
    `);

    // 3. Add film_lot_id to film and backfill via the temp column
    this.addSql(
      `ALTER TABLE film ADD COLUMN film_lot_id INTEGER REFERENCES film_lot(id);`,
    );
    this.addSql(`
      UPDATE film SET film_lot_id = (
        SELECT fl.id FROM film_lot fl WHERE fl._film_id = film.id
      );
    `);
    this.addSql(`ALTER TABLE film_lot DROP COLUMN _film_id;`);

    // 4. Recreate film_frame: replace film_stock_id + legacy_film_id with film_id,
    //    drop bound_holder_device_id, bound_holder_slot_number, first_loaded_at
    this.addSql(`
      CREATE TABLE film_frame_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES user(id),
        film_id INTEGER NOT NULL REFERENCES film(id),
        frame_number INTEGER NOT NULL,
        current_state_id INTEGER NOT NULL REFERENCES film_state(id)
      );
    `);
    this.addSql(`
      INSERT INTO film_frame_new (id, user_id, film_id, frame_number, current_state_id)
      SELECT id, user_id, legacy_film_id, frame_number, current_state_id
      FROM film_frame
      WHERE legacy_film_id IS NOT NULL;
    `);
    this.addSql(`DROP TABLE film_frame;`);
    this.addSql(`ALTER TABLE film_frame_new RENAME TO film_frame;`);
    this.addSql(
      `CREATE INDEX film_frame_film_id_index ON film_frame (film_id);`,
    );

    // 5. Drop the now-orphaned film_stock table
    this.addSql(`DROP TABLE IF EXISTS film_stock;`);
  }

  override async down(): Promise<void> {
    // SQLite table recreation makes full reversal complex; this is intentionally a no-op.
    // Restore from backup or re-run seed on a fresh database.
  }
}
