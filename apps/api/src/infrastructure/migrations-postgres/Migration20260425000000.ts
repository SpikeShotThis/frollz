import { Migration } from '@mikro-orm/migrations';

export class Migration20260425000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "idempotency_key" ADD COLUMN IF NOT EXISTS "expires_at" text null;`);
    this.addSql(`ALTER TABLE "film" ADD COLUMN IF NOT EXISTS "current_device_id" int null;`);
    this.addSql(`ALTER TABLE "film" DROP CONSTRAINT IF EXISTS "film_current_device_id_foreign";`);
    this.addSql(`ALTER TABLE "film" ADD CONSTRAINT "film_current_device_id_foreign" FOREIGN KEY ("current_device_id") REFERENCES "film_device" ("id") ON DELETE SET NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "idempotency_key" DROP COLUMN IF EXISTS "expires_at";`);
    this.addSql(`ALTER TABLE "film" DROP CONSTRAINT IF EXISTS "film_current_device_id_foreign";`);
    this.addSql(`ALTER TABLE "film" DROP COLUMN IF EXISTS "current_device_id";`);
  }
}
