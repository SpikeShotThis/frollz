import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'refresh_tokens' })
@Unique({ properties: ['tokenHash'] })
export class RefreshTokenEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @Property({ type: 'text', fieldName: 'token_hash' })
  tokenHash!: string;

  @Property({ type: 'text', fieldName: 'created_at' })
  createdAt!: string;

  @Property({ type: 'text', fieldName: 'expires_at' })
  expiresAt!: string;
}
