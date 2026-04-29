import { Migration } from '@mikro-orm/migrations';

export class Migration20260423100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `film_unit` rename to `film_frame`;');
    this.addSql('alter table `film_frame` rename column `ordinal` to `frame_number`;');

    this.addSql('drop index if exists `film_unit_user_id_index`;');
    this.addSql('drop index if exists `film_unit_film_stock_id_index`;');
    this.addSql('drop index if exists `film_unit_current_state_id_index`;');
    this.addSql('drop index if exists `film_unit_bound_holder_device_id_index`;');
    this.addSql('drop index if exists `film_unit_film_stock_id_ordinal_unique`;');
    this.addSql('drop index if exists `film_unit_legacy_film_id_index`;');

    this.addSql('create index `film_frame_user_id_index` on `film_frame` (`user_id`);');
    this.addSql('create index `film_frame_film_stock_id_index` on `film_frame` (`film_stock_id`);');
    this.addSql('create index `film_frame_current_state_id_index` on `film_frame` (`current_state_id`);');
    this.addSql('create index `film_frame_bound_holder_device_id_index` on `film_frame` (`bound_holder_device_id`);');
    this.addSql('create unique index `film_frame_film_stock_id_frame_number_unique` on `film_frame` (`film_stock_id`, `frame_number`);');
    this.addSql('create index `film_frame_legacy_film_id_index` on `film_frame` (`legacy_film_id`);');

    this.addSql('create table `frame_journey_event` (`id` integer not null primary key autoincrement, `film_id` integer not null, `film_frame_id` integer not null, `user_id` integer not null, `film_state_id` integer not null, `occurred_at` text not null, `recorded_at` text not null, `notes` text null, `event_data` json not null, constraint `frame_journey_event_film_id_foreign` foreign key(`film_id`) references `film`(`id`) on update cascade, constraint `frame_journey_event_film_frame_id_foreign` foreign key(`film_frame_id`) references `film_frame`(`id`) on update cascade, constraint `frame_journey_event_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade, constraint `frame_journey_event_film_state_id_foreign` foreign key(`film_state_id`) references `film_state`(`id`) on update cascade);');
    this.addSql('create index `frame_journey_event_film_id_index` on `frame_journey_event` (`film_id`);');
    this.addSql('create index `frame_journey_event_film_frame_id_index` on `frame_journey_event` (`film_frame_id`);');
    this.addSql('create index `frame_journey_event_user_id_index` on `frame_journey_event` (`user_id`);');
    this.addSql('create index `frame_journey_event_film_state_id_index` on `frame_journey_event` (`film_state_id`);');

    this.addSql("update `film_journey_event` set `event_data` = json_remove(json_set(`event_data`, '$.filmFrameId', json_extract(`event_data`, '$.filmUnitId')), '$.filmUnitId') where json_type(`event_data`, '$.filmUnitId') is not null;");
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `frame_journey_event`;');

    this.addSql('drop index if exists `film_frame_user_id_index`;');
    this.addSql('drop index if exists `film_frame_film_stock_id_index`;');
    this.addSql('drop index if exists `film_frame_current_state_id_index`;');
    this.addSql('drop index if exists `film_frame_bound_holder_device_id_index`;');
    this.addSql('drop index if exists `film_frame_film_stock_id_frame_number_unique`;');
    this.addSql('drop index if exists `film_frame_legacy_film_id_index`;');

    this.addSql('alter table `film_frame` rename column `frame_number` to `ordinal`;');
    this.addSql('alter table `film_frame` rename to `film_unit`;');

    this.addSql('create index `film_unit_user_id_index` on `film_unit` (`user_id`);');
    this.addSql('create index `film_unit_film_stock_id_index` on `film_unit` (`film_stock_id`);');
    this.addSql('create index `film_unit_current_state_id_index` on `film_unit` (`current_state_id`);');
    this.addSql('create index `film_unit_bound_holder_device_id_index` on `film_unit` (`bound_holder_device_id`);');
    this.addSql('create unique index `film_unit_film_stock_id_ordinal_unique` on `film_unit` (`film_stock_id`, `ordinal`);');
    this.addSql('create index `film_unit_legacy_film_id_index` on `film_unit` (`legacy_film_id`);');

    this.addSql("update `film_journey_event` set `event_data` = json_remove(json_set(`event_data`, '$.filmUnitId', json_extract(`event_data`, '$.filmFrameId')), '$.filmFrameId') where json_type(`event_data`, '$.filmFrameId') is not null;");
  }
}
