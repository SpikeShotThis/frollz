import { Migration } from '@mikro-orm/migrations';

export class Migration20260421120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table `idempotency_key` (`id` integer not null primary key autoincrement, `user_id` integer not null, `scope` text not null, `key` text not null, `request_hash` text not null, `response_body` json not null, `created_at` text not null, constraint `idempotency_key_user_id_foreign` foreign key(`user_id`) references `user`(`id`) on update cascade);');
    this.addSql('create index `idempotency_key_user_id_index` on `idempotency_key` (`user_id`);');
    this.addSql('create unique index `idempotency_key_user_id_scope_key_unique` on `idempotency_key` (`user_id`, `scope`, `key`);');
  }
}
