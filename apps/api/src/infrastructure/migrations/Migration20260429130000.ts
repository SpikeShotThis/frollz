import { Migration } from '@mikro-orm/migrations';

export class Migration20260429130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table `film_lab` (`id` integer not null primary key autoincrement, `user_id` integer not null, `name` text not null, `normalized_name` text not null, `contact` text null, `email` text null, `website` text null, `default_processes` text null, `notes` text null, `active` integer not null default true, `rating` integer null, constraint `film_lab_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade);'
    );
    this.addSql('create index `film_lab_user_active_name_index` on `film_lab` (`user_id`, `active`, `name`);');
    this.addSql('create unique index `film_lab_user_normalized_name_unique` on `film_lab` (`user_id`, `normalized_name`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `film_lab`;');
  }
}
