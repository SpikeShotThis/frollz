import { Migration } from '@mikro-orm/migrations';

export class Migration20260430100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('pragma foreign_keys = off;');
    this.addSql('create table `film_lot_new` (`id` integer not null primary key autoincrement, `user_id` integer not null, `emulsion_id` integer not null, `package_type_id` integer not null, `film_format_id` integer not null, `quantity` integer not null default 1, `expiration_date` text null, `created_at` text not null, `supplier_id` integer null references `film_supplier`(`id`) on update cascade on delete set null, `purchase_info` json null, `rating` integer null);');
    this.addSql(`
      insert into \`film_lot_new\` (\`id\`, \`user_id\`, \`emulsion_id\`, \`package_type_id\`, \`film_format_id\`, \`quantity\`, \`expiration_date\`, \`created_at\`, \`supplier_id\`, \`purchase_info\`, \`rating\`)
      select
        \`id\`,
        \`user_id\`,
        \`emulsion_id\`,
        \`package_type_id\`,
        \`film_format_id\`,
        \`quantity\`,
        \`expiration_date\`,
        \`created_at\`,
        (
          select fs.\`id\`
          from \`film_supplier\` fs
          where fs.\`id\` = \`film_lot\`.\`supplier_id\`
          limit 1
        ),
        json_object(
          'channel', \`purchase_channel\`,
          'price', \`purchase_price\`,
          'currencyCode', upper(\`purchase_currency_code\`),
          'orderRef', \`order_ref\`,
          'obtainedDate', \`obtained_date\`
        ),
        \`rating\`
      from \`film_lot\`;
    `);
    this.addSql('drop table `film_lot`;');
    this.addSql('alter table `film_lot_new` rename to `film_lot`;');
    this.addSql('create index `film_lot_supplier_id_index` on `film_lot` (`supplier_id`);');
    this.addSql('pragma foreign_keys = on;');
  }

  override async down(): Promise<void> {
    this.addSql('pragma foreign_keys = off;');
    this.addSql('create table `film_lot_new` (`id` integer not null primary key autoincrement, `user_id` integer not null, `emulsion_id` integer not null, `package_type_id` integer not null, `film_format_id` integer not null, `quantity` integer not null default 1, `expiration_date` text null, `created_at` text not null, `supplier_id` integer null references `film_supplier`(`id`) on update cascade on delete set null, `purchase_channel` text null, `purchase_price` real null, `purchase_currency_code` text null, `order_ref` text null, `obtained_date` text null, `rating` integer null);');
    this.addSql(`
      insert into \`film_lot_new\` (\`id\`, \`user_id\`, \`emulsion_id\`, \`package_type_id\`, \`film_format_id\`, \`quantity\`, \`expiration_date\`, \`created_at\`, \`supplier_id\`, \`purchase_channel\`, \`purchase_price\`, \`purchase_currency_code\`, \`order_ref\`, \`obtained_date\`, \`rating\`)
      select
        \`id\`,
        \`user_id\`,
        \`emulsion_id\`,
        \`package_type_id\`,
        \`film_format_id\`,
        \`quantity\`,
        \`expiration_date\`,
        \`created_at\`,
        \`supplier_id\`,
        json_extract(\`purchase_info\`, '$.channel'),
        cast(json_extract(\`purchase_info\`, '$.price') as real),
        json_extract(\`purchase_info\`, '$.currencyCode'),
        json_extract(\`purchase_info\`, '$.orderRef'),
        json_extract(\`purchase_info\`, '$.obtainedDate'),
        \`rating\`
      from \`film_lot\`;
    `);
    this.addSql('drop index if exists `film_lot_supplier_id_index`;');
    this.addSql('drop table `film_lot`;');
    this.addSql('alter table `film_lot_new` rename to `film_lot`;');
    this.addSql('create index `film_lot_supplier_id_index` on `film_lot` (`supplier_id`);');
    this.addSql('pragma foreign_keys = on;');
  }
}
