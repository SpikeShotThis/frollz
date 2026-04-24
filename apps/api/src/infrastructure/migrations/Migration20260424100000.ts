import { Migration } from '@mikro-orm/migrations';

export class Migration20260424100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql("update `package_type` set `code` = '120_roll', `label` = '120 roll' where `film_format_id` = (select `id` from `film_format` where `code` = '120') and `code` = 'roll';");
    this.addSql("update `package_type` set `code` = '220_roll', `label` = '220 roll', `film_format_id` = (select `id` from `film_format` where `code` = '120') where `film_format_id` = (select `id` from `film_format` where `code` = '220') and `code` = 'roll';");

    this.addSql("update `film` set `film_format_id` = (select `id` from `film_format` where `code` = '120') where `film_format_id` = (select `id` from `film_format` where `code` = '220');");
    this.addSql("update `film_stock` set `film_format_id` = (select `id` from `film_format` where `code` = '120') where `film_format_id` = (select `id` from `film_format` where `code` = '220');");
    this.addSql("update `film_device` set `film_format_id` = (select `id` from `film_format` where `code` = '120') where `film_format_id` = (select `id` from `film_format` where `code` = '220');");

    this.addSql("delete from `emulsion_film_format` where `film_format_entity_id` = (select `id` from `film_format` where `code` = '220') and `emulsion_entity_id` in (select `emulsion_entity_id` from `emulsion_film_format` where `film_format_entity_id` = (select `id` from `film_format` where `code` = '120'));");
    this.addSql("update `emulsion_film_format` set `film_format_entity_id` = (select `id` from `film_format` where `code` = '120') where `film_format_entity_id` = (select `id` from `film_format` where `code` = '220');");

    this.addSql("delete from `film_format` where `code` = '220';");
  }

  override async down(): Promise<void> {
    this.addSql("insert into `film_format` (`code`, `label`) select '220', '220' where not exists (select 1 from `film_format` where `code` = '220');");

    this.addSql("update `package_type` set `code` = 'roll', `label` = 'Roll' where `film_format_id` = (select `id` from `film_format` where `code` = '120') and `code` = '120_roll';");
    this.addSql("update `package_type` set `code` = 'roll', `label` = 'Roll', `film_format_id` = (select `id` from `film_format` where `code` = '220') where `film_format_id` = (select `id` from `film_format` where `code` = '120') and `code` = '220_roll';");

    this.addSql("update `film` set `film_format_id` = (select `id` from `film_format` where `code` = '220') where `package_type_id` in (select `id` from `package_type` where `film_format_id` = (select `id` from `film_format` where `code` = '220') and `code` = 'roll');");
    this.addSql("update `film_stock` set `film_format_id` = (select `id` from `film_format` where `code` = '220') where `package_type_id` in (select `id` from `package_type` where `film_format_id` = (select `id` from `film_format` where `code` = '220') and `code` = 'roll');");

    this.addSql("insert into `emulsion_film_format` (`emulsion_entity_id`, `film_format_entity_id`) select `emulsion_entity_id`, (select `id` from `film_format` where `code` = '220') from `emulsion_film_format` where `film_format_entity_id` = (select `id` from `film_format` where `code` = '120') and not exists (select 1 from `emulsion_film_format` ef2 where ef2.`emulsion_entity_id` = `emulsion_film_format`.`emulsion_entity_id` and ef2.`film_format_entity_id` = (select `id` from `film_format` where `code` = '220'));");
  }
}
