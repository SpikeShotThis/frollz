import { Migration } from '@mikro-orm/migrations';

export class Migration20260424113000 extends Migration {
  override async up(): Promise<void> {
    this.addSql("update `film_device` set `frame_size` = 'instax_mini' where `frame_size` = 'instax' and `film_format_id` = (select `id` from `film_format` where `code` = 'InstaxMini');");
    this.addSql("update `film_device` set `frame_size` = 'instax_wide' where `frame_size` = 'instax' and `film_format_id` = (select `id` from `film_format` where `code` = 'InstaxWide');");
    this.addSql("update `film_device` set `frame_size` = 'instax_square' where `frame_size` = 'instax' and `film_format_id` = (select `id` from `film_format` where `code` = 'InstaxSquare');");
  }

  override async down(): Promise<void> {
    this.addSql("update `film_device` set `frame_size` = 'instax' where `frame_size` in ('instax_mini', 'instax_wide', 'instax_square');");
  }
}
