import { Migration } from '@mikro-orm/migrations';

export class Migration20260422120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `refresh_tokens` add column `previous_token_hash` text null;');
    this.addSql('alter table `refresh_tokens` add column `previous_token_grace_until` text null;');
    this.addSql('alter table `refresh_tokens` add column `revoked_at` text null;');
    this.addSql('create index `refresh_tokens_previous_token_hash_index` on `refresh_tokens` (`previous_token_hash`);');
  }

  override async down(): Promise<void> {
    this.addSql('drop index if exists `refresh_tokens_previous_token_hash_index`;');

    this.addSql('alter table `refresh_tokens` drop column `previous_token_hash`;');
    this.addSql('alter table `refresh_tokens` drop column `previous_token_grace_until`;');
    this.addSql('alter table `refresh_tokens` drop column `revoked_at`;');
  }
}
