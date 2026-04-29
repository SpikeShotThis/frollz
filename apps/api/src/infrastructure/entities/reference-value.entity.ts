import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'reference_value' })
@Unique({ properties: ['user', 'kind', 'normalizedValue'] })
@Index({ properties: ['user', 'kind', 'usageCount', 'lastUsedAt'] })
export class ReferenceValueEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @Property({ type: 'text' })
  kind!: string;

  @Property({ type: 'text' })
  value!: string;

  @Property({ type: 'text', fieldName: 'normalized_value' })
  normalizedValue!: string;

  @Property({ type: 'integer', fieldName: 'usage_count' })
  usageCount!: number;

  @Property({ type: 'text', fieldName: 'last_used_at' })
  lastUsedAt!: string;
}
