import { Migration } from '@mikro-orm/migrations';

export class Migration20260422170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql("alter table `camera` add column `load_mode` text not null default 'direct';");
    this.addSql('alter table `camera` add column `can_unload` integer not null default 1;');
    this.addSql('alter table `camera` add column `camera_system` text null;');

    this.addSql('alter table `film_holder` add column `slot_count` integer not null default 2 check (`slot_count` in (1, 2));');

    this.addSql('create table `film_stock` (`id` integer not null primary key autoincrement, `user_id` integer not null, `name` text not null, `emulsion_id` integer not null, `package_type_id` integer not null, `film_format_id` integer not null, `units_total` integer not null, `expiration_date` text null, constraint `film_stock_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade, constraint `film_stock_emulsion_id_foreign` foreign key(`emulsion_id`) references `emulsion`(`id`) on update cascade, constraint `film_stock_package_type_id_foreign` foreign key(`package_type_id`) references `package_type`(`id`) on update cascade, constraint `film_stock_film_format_id_foreign` foreign key(`film_format_id`) references `film_format`(`id`) on update cascade);');
    this.addSql('create index `film_stock_user_id_index` on `film_stock` (`user_id`);');
    this.addSql('create index `film_stock_emulsion_id_index` on `film_stock` (`emulsion_id`);');
    this.addSql('create index `film_stock_package_type_id_index` on `film_stock` (`package_type_id`);');
    this.addSql('create index `film_stock_film_format_id_index` on `film_stock` (`film_format_id`);');
    this.addSql('create unique index `film_stock_user_id_name_unique` on `film_stock` (`user_id`, `name`);');

    this.addSql('create table `film_unit` (`id` integer not null primary key autoincrement, `user_id` integer not null, `film_stock_id` integer not null, `ordinal` integer not null, `current_state_id` integer not null, `bound_holder_device_id` integer null, `bound_holder_slot_number` integer null, `first_loaded_at` text null, constraint `film_unit_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade, constraint `film_unit_film_stock_id_foreign` foreign key(`film_stock_id`) references `film_stock`(`id`) on update cascade, constraint `film_unit_current_state_id_foreign` foreign key(`current_state_id`) references `film_state`(`id`) on update cascade, constraint `film_unit_bound_holder_device_id_foreign` foreign key(`bound_holder_device_id`) references `film_device`(`id`) on update cascade, check (`bound_holder_slot_number` is null or `bound_holder_slot_number` in (1, 2)));');
    this.addSql('create index `film_unit_user_id_index` on `film_unit` (`user_id`);');
    this.addSql('create index `film_unit_film_stock_id_index` on `film_unit` (`film_stock_id`);');
    this.addSql('create index `film_unit_current_state_id_index` on `film_unit` (`current_state_id`);');
    this.addSql('create index `film_unit_bound_holder_device_id_index` on `film_unit` (`bound_holder_device_id`);');
    this.addSql('create unique index `film_unit_film_stock_id_ordinal_unique` on `film_unit` (`film_stock_id`, `ordinal`);');

    this.addSql('create table `device_mount` (`id` integer not null primary key autoincrement, `user_id` integer not null, `camera_device_id` integer not null, `mounted_device_id` integer not null, `mounted_at` text not null, `unmounted_at` text null, constraint `device_mount_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade, constraint `device_mount_camera_device_id_foreign` foreign key(`camera_device_id`) references `film_device`(`id`) on update cascade, constraint `device_mount_mounted_device_id_foreign` foreign key(`mounted_device_id`) references `film_device`(`id`) on update cascade);');
    this.addSql('create index `device_mount_user_id_index` on `device_mount` (`user_id`);');
    this.addSql('create index `device_mount_camera_device_id_index` on `device_mount` (`camera_device_id`);');
    this.addSql('create index `device_mount_mounted_device_id_index` on `device_mount` (`mounted_device_id`);');
    this.addSql('create index `device_mount_unmounted_at_index` on `device_mount` (`unmounted_at`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `device_mount`;');
    this.addSql('drop table if exists `film_unit`;');
    this.addSql('drop table if exists `film_stock`;');

    this.addSql('alter table `film_holder` drop column `slot_count`;');

    this.addSql('alter table `camera` drop column `camera_system`;');
    this.addSql('alter table `camera` drop column `can_unload`;');
    this.addSql('alter table `camera` drop column `load_mode`;');
  }
}
