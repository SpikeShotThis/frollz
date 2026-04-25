import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'idempotency_key' })
@Unique({ properties: ['user', 'scope', 'key'] })
export class IdempotencyKeyEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @Property({ type: 'text' })
  scope!: string;

  @Property({ type: 'text' })
  key!: string;

  @Property({ type: 'text', fieldName: 'request_hash' })
  requestHash!: string;

  @Property({ type: 'json', fieldName: 'response_body' })
  responseBody!: unknown;

  @Property({ type: 'text', fieldName: 'created_at' })
  createdAt!: string;

  @Property({ type: 'text', fieldName: 'expires_at', nullable: true })
  expiresAt: string | null = null;
}
