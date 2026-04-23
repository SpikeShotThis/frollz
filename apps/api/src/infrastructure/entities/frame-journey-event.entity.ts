import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { FilmEntity } from './film.entity.js';
import { FilmFrameEntity } from './film-frame.entity.js';
import { FilmStateEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'frame_journey_event' })
export class FrameJourneyEventEntity extends AutoIncrementEntity {
  @ManyToOne(() => FilmEntity, { fieldName: 'film_id' })
  film!: FilmEntity;

  @ManyToOne(() => FilmFrameEntity, { fieldName: 'film_frame_id' })
  filmFrame!: FilmFrameEntity;

  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmStateEntity, { fieldName: 'film_state_id' })
  filmState!: FilmStateEntity;

  @Property({ type: 'text', fieldName: 'occurred_at' })
  occurredAt!: string;

  @Property({ type: 'text', fieldName: 'recorded_at' })
  recordedAt!: string;

  @Property({ type: 'text', nullable: true })
  notes!: string | null;

  @Property({ type: 'json', fieldName: 'event_data' })
  eventData!: Record<string, unknown>;
}
