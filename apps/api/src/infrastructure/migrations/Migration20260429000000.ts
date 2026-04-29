import { Migration } from '@mikro-orm/migrations';

export class Migration20260429000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table `reference_value` (`id` integer not null primary key autoincrement, `user_id` integer not null, `kind` text not null, `value` text not null, `normalized_value` text not null, `usage_count` integer not null, `last_used_at` text not null, constraint `reference_value_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade);');
    this.addSql('create unique index `reference_value_user_id_kind_normalized_value_unique` on `reference_value` (`user_id`, `kind`, `normalized_value`);');
    this.addSql('create index `reference_value_user_id_kind_usage_count_last_used_at_index` on `reference_value` (`user_id`, `kind`, `usage_count`, `last_used_at`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `reference_value`;');
  }
}
