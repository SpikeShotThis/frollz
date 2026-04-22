import { Migration } from '@mikro-orm/migrations';

export class Migration20260422000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('drop index if exists `receiver_type_code_unique`;');

    this.addSql('alter table `receiver_type` rename to `device_type`;');
    this.addSql('alter table `film_receiver` rename to `film_device`;');
    this.addSql('create unique index if not exists `device_type_code_unique` on `device_type` (`code`);');

    this.addSql('alter table `film_device` rename column `receiver_type_id` to `device_type_id`;');

    this.addSql('alter table `camera` rename column `film_receiver_id` to `film_device_id`;');
    this.addSql('alter table `interchangeable_back` rename column `film_receiver_id` to `film_device_id`;');
    this.addSql('alter table `film_holder` rename column `film_receiver_id` to `film_device_id`;');
    this.addSql('alter table `film_holder_slot` rename column `film_receiver_id` to `film_device_id`;');

    this.addSql('drop index if exists `film_receiver_user_id_index`;');
    this.addSql('drop index if exists `film_receiver_receiver_type_id_index`;');
    this.addSql('drop index if exists `film_receiver_film_format_id_index`;');

    this.addSql('create index if not exists `film_device_user_id_index` on `film_device` (`user_id`);');
    this.addSql('create index if not exists `film_device_device_type_id_index` on `film_device` (`device_type_id`);');
    this.addSql('create index if not exists `film_device_film_format_id_index` on `film_device` (`film_format_id`);');

    this.addSql('drop index if exists `film_holder_slot_film_receiver_id_index`;');
    this.addSql('create index if not exists `film_holder_slot_film_device_id_index` on `film_holder_slot` (`film_device_id`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop index if exists `film_holder_slot_film_device_id_index`;');
    this.addSql('create index if not exists `film_holder_slot_film_receiver_id_index` on `film_holder_slot` (`film_receiver_id`);');

    this.addSql('drop index if exists `film_device_user_id_index`;');
    this.addSql('drop index if exists `film_device_device_type_id_index`;');
    this.addSql('drop index if exists `film_device_film_format_id_index`;');

    this.addSql('create index if not exists `film_receiver_user_id_index` on `film_receiver` (`user_id`);');
    this.addSql('create index if not exists `film_receiver_receiver_type_id_index` on `film_receiver` (`receiver_type_id`);');
    this.addSql('create index if not exists `film_receiver_film_format_id_index` on `film_receiver` (`film_format_id`);');

    this.addSql('alter table `film_holder_slot` rename column `film_device_id` to `film_receiver_id`;');
    this.addSql('alter table `film_holder` rename column `film_device_id` to `film_receiver_id`;');
    this.addSql('alter table `interchangeable_back` rename column `film_device_id` to `film_receiver_id`;');
    this.addSql('alter table `camera` rename column `film_device_id` to `film_receiver_id`;');

    this.addSql('alter table `film_device` rename column `device_type_id` to `receiver_type_id`;');

    this.addSql('alter table `film_device` rename to `film_receiver`;');
    this.addSql('alter table `device_type` rename to `receiver_type`;');

    this.addSql('drop index if exists `device_type_code_unique`;');
    this.addSql('create unique index if not exists `receiver_type_code_unique` on `receiver_type` (`code`);');
  }
}
