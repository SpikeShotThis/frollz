import { Migration } from '@mikro-orm/migrations';

export class Migration20260421103000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('drop index if exists `package_type_code_unique`;');

    this.addSql("update `package_type` set `code` = '24exp' where `code` = '35mm_24exp';");
    this.addSql("update `package_type` set `code` = '36exp' where `code` = '35mm_36exp';");
    this.addSql("update `package_type` set `code` = '100ft_bulk' where `code` = '35mm_100ft_bulk';");
    this.addSql("update `package_type` set `code` = 'roll' where `code` = '120_roll';");
    this.addSql("update `package_type` set `code` = 'roll' where `code` = '220_roll';");
    this.addSql("update `package_type` set `code` = '10sheets' where `code` in ('4x5_10sheets', '2x3_10sheets', '8x10_10sheets');");
    this.addSql("update `package_type` set `code` = '25sheets' where `code` in ('4x5_25sheets', '2x3_25sheets', '8x10_25sheets');");
    this.addSql("update `package_type` set `code` = '50sheets' where `code` in ('4x5_50sheets', '2x3_50sheets', '8x10_50sheets');");
    this.addSql("update `package_type` set `code` = 'pack' where `code` in ('instaxmini_pack', 'instaxwide_pack', 'instaxsquare_pack');");

    this.addSql('create unique index if not exists `package_type_film_format_id_code_unique` on `package_type` (`film_format_id`, `code`);');
  }
}
