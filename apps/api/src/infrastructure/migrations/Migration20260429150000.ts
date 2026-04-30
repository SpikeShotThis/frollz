import { Migration } from '@mikro-orm/migrations';

export class Migration20260429150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table `film_supplier` (`id` integer not null primary key autoincrement, `user_id` integer not null, `name` text not null, `normalized_name` text not null, `contact` text null, `email` text null, `website` text null, `notes` text null, `active` integer not null default true, `rating` integer null, constraint `film_supplier_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade);'
    );
    this.addSql('create index `film_supplier_user_active_name_index` on `film_supplier` (`user_id`, `active`, `name`);');
    this.addSql('create unique index `film_supplier_user_normalized_name_unique` on `film_supplier` (`user_id`, `normalized_name`);');

    this.addSql('pragma foreign_keys = off;');
    this.addSql('create table `film_lot_new` (`id` integer not null primary key autoincrement, `user_id` integer not null, `emulsion_id` integer not null, `package_type_id` integer not null, `film_format_id` integer not null, `quantity` integer not null default 1, `expiration_date` text null, `created_at` text not null, `supplier_id` integer null references `film_supplier`(`id`) on update cascade on delete set null, `purchase_channel` text null, `purchase_price` real null, `purchase_currency_code` text null, `order_ref` text null, `obtained_date` text null, `rating` integer null);');
    this.addSql('insert into `film_lot_new` select `id`, `user_id`, `emulsion_id`, `package_type_id`, `film_format_id`, `quantity`, `expiration_date`, `created_at`, null, null, null, null, null, null, null from `film_lot`;');
    this.addSql('drop table `film_lot`;');
    this.addSql('alter table `film_lot_new` rename to `film_lot`;');
    this.addSql('update `film_lot` set `obtained_date` = `created_at` where `obtained_date` is null;');
    this.addSql('create index `film_lot_supplier_id_index` on `film_lot` (`supplier_id`);');
    this.addSql('pragma foreign_keys = on;');
  }

  override async down(): Promise<void> {
    this.addSql('pragma foreign_keys = off;');
    this.addSql('create table `film_lot_new` (`id` integer not null primary key autoincrement, `user_id` integer not null, `emulsion_id` integer not null, `package_type_id` integer not null, `film_format_id` integer not null, `quantity` integer not null default 1, `expiration_date` text null, `created_at` text not null);');
    this.addSql('insert into `film_lot_new` select `id`, `user_id`, `emulsion_id`, `package_type_id`, `film_format_id`, `quantity`, `expiration_date`, `created_at` from `film_lot`;');
    this.addSql('drop index if exists `film_lot_supplier_id_index`;');
    this.addSql('drop table `film_lot`;');
    this.addSql('alter table `film_lot_new` rename to `film_lot`;');
    this.addSql('pragma foreign_keys = on;');
    this.addSql('drop table if exists `film_supplier`;');
  }
}
