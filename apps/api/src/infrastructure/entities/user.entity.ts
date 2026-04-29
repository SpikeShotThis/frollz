import { Entity, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';

@Entity({ tableName: 'user' })
@Unique({ properties: ['email'] })
export class UserEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', fieldName: 'password_hash' })
  passwordHash!: string;

  @Property({ type: 'text', fieldName: 'created_at' })
  createdAt!: string;
}
