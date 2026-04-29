import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { FilmStateEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';
import { FilmEntity } from './film.entity.js';

@Entity({ tableName: 'film_frame' })
export class FilmFrameEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmEntity, { fieldName: 'film_id' })
  film!: FilmEntity;

  @Property({ type: 'integer', fieldName: 'frame_number' })
  frameNumber!: number;

  @ManyToOne(() => FilmStateEntity, { fieldName: 'current_state_id' })
  currentState!: FilmStateEntity;
}
