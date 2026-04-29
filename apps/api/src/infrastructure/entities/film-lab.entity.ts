import { Entity, ManyToOne, Property, Unique, Index } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'film_lab' })
@Unique({ properties: ['user', 'normalizedName'] })
@Index({ properties: ['user', 'active', 'name'] })
export class FilmLabEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', fieldName: 'normalized_name' })
  normalizedName!: string;

  @Property({ type: 'text', nullable: true })
  contact!: string | null;

  @Property({ type: 'text', nullable: true })
  email!: string | null;

  @Property({ type: 'text', nullable: true })
  website!: string | null;

  @Property({ type: 'text', fieldName: 'default_processes', nullable: true })
  defaultProcesses!: string | null;

  @Property({ type: 'text', nullable: true })
  notes!: string | null;

  @Property({ type: 'boolean', default: true })
  active = true;

  @Property({ type: 'integer', nullable: true })
  rating!: number | null;
}
