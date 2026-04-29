import { Migration } from '@mikro-orm/migrations';

export class Migration20260429150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table `film_supplier` (`id` integer not null primary key autoincrement, `user_id` integer not null, `name` text not null, `normalized_name` text not null, `contact` text null, `email` text null, `website` text null, `notes` text null, `active` integer not null default true, `rating` integer null, constraint `film_supplier_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade);'
    );
    this.addSql('create index `film_supplier_user_active_name_index` on `film_supplier` (`user_id`, `active`, `name`);');
    this.addSql('create unique index `film_supplier_user_normalized_name_unique` on `film_supplier` (`user_id`, `normalized_name`);');

    this.addSql('alter table `film_lot` add column `supplier_id` integer null;');
    this.addSql('alter table `film_lot` add column `supplier_name` text null;');
    this.addSql('alter table `film_lot` add column `purchase_channel` text null;');
    this.addSql('alter table `film_lot` add column `purchase_price` real null;');
    this.addSql('alter table `film_lot` add column `purchase_currency_code` text null;');
    this.addSql('alter table `film_lot` add column `order_ref` text null;');
    this.addSql('alter table `film_lot` add column `obtained_date` text null;');
    this.addSql('alter table `film_lot` add column `rating` integer null;');
    this.addSql('update `film_lot` set `obtained_date` = `created_at` where `obtained_date` is null;');
    this.addSql('create index `film_lot_supplier_id_index` on `film_lot` (`supplier_id`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop index if exists `film_lot_supplier_id_index`;');
    this.addSql('alter table `film_lot` drop column `supplier_id`;');
    this.addSql('alter table `film_lot` drop column `supplier_name`;');
    this.addSql('alter table `film_lot` drop column `purchase_channel`;');
    this.addSql('alter table `film_lot` drop column `purchase_price`;');
    this.addSql('alter table `film_lot` drop column `purchase_currency_code`;');
    this.addSql('alter table `film_lot` drop column `order_ref`;');
    this.addSql('alter table `film_lot` drop column `obtained_date`;');
    this.addSql('alter table `film_lot` drop column `rating`;');
    this.addSql('drop table if exists `film_supplier`;');
  }
}
