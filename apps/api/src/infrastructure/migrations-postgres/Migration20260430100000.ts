import { Migration } from '@mikro-orm/migrations';

export class Migration20260430100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "film_lot" add column "purchase_info" jsonb null;');
    this.addSql(`
      update "film_lot"
      set "purchase_info" = jsonb_strip_nulls(
        jsonb_build_object(
          'channel', "purchase_channel",
          'price', "purchase_price",
          'currencyCode', upper("purchase_currency_code"),
          'orderRef', "order_ref",
          'obtainedDate', "obtained_date"
        )
      );
    `);
    this.addSql('alter table "film_lot" drop column "purchase_channel";');
    this.addSql('alter table "film_lot" drop column "purchase_price";');
    this.addSql('alter table "film_lot" drop column "purchase_currency_code";');
    this.addSql('alter table "film_lot" drop column "order_ref";');
    this.addSql('alter table "film_lot" drop column "obtained_date";');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "film_lot" add column "purchase_channel" text null;');
    this.addSql('alter table "film_lot" add column "purchase_price" real null;');
    this.addSql('alter table "film_lot" add column "purchase_currency_code" text null;');
    this.addSql('alter table "film_lot" add column "order_ref" text null;');
    this.addSql('alter table "film_lot" add column "obtained_date" text null;');
    this.addSql('update "film_lot" set "purchase_channel" = "purchase_info"->>\'channel\';');
    this.addSql('update "film_lot" set "purchase_price" = (("purchase_info"->>\'price\')::double precision);');
    this.addSql('update "film_lot" set "purchase_currency_code" = "purchase_info"->>\'currencyCode\';');
    this.addSql('update "film_lot" set "order_ref" = "purchase_info"->>\'orderRef\';');
    this.addSql('update "film_lot" set "obtained_date" = "purchase_info"->>\'obtainedDate\';');
    this.addSql('alter table "film_lot" drop column "purchase_info";');
  }
}
