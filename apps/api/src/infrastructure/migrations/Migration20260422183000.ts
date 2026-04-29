import { Migration } from '@mikro-orm/migrations';

export class Migration20260422183000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `film_unit` add column `legacy_film_id` integer null;');
    this.addSql('create index `film_unit_legacy_film_id_index` on `film_unit` (`legacy_film_id`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop index if exists `film_unit_legacy_film_id_index`;');
    this.addSql('alter table `film_unit` drop column `legacy_film_id`;');
  }
}
