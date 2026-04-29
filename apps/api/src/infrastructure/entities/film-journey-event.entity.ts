import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { FilmEntity } from './film.entity.js';
import { FilmStateEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'film_journey_event' })
export class FilmJourneyEventEntity extends AutoIncrementEntity {
  @ManyToOne(() => FilmEntity, { fieldName: 'film_id' })
  film!: Rel<FilmEntity>;

  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: Rel<UserEntity>;

  @ManyToOne(() => FilmStateEntity, { fieldName: 'film_state_id' })
  filmState!: Rel<FilmStateEntity>;

  @Property({ type: 'text', fieldName: 'occurred_at' })
  occurredAt!: string;

  @Property({ type: 'text', fieldName: 'recorded_at' })
  recordedAt!: string;

  @Property({ type: 'text', nullable: true })
  notes!: string | null;

  @Property({ type: 'json', fieldName: 'event_data' })
  eventData!: Record<string, unknown>;
}
