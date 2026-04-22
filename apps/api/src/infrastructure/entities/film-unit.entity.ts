import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { FilmStateEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';
import { FilmStockEntity } from './film-stock.entity.js';
import { FilmDeviceEntity } from './device.entities.js';

@Entity({ tableName: 'film_unit' })
export class FilmUnitEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmStockEntity, { fieldName: 'film_stock_id' })
  filmStock!: FilmStockEntity;

  @Property({ type: 'integer' })
  ordinal!: number;

  @ManyToOne(() => FilmStateEntity, { fieldName: 'current_state_id' })
  currentState!: FilmStateEntity;

  @ManyToOne(() => FilmDeviceEntity, { nullable: true, fieldName: 'bound_holder_device_id' })
  boundHolderDevice!: FilmDeviceEntity | null;

  @Property({ type: 'integer', nullable: true, fieldName: 'bound_holder_slot_number' })
  boundHolderSlotNumber!: number | null;

  @Property({ type: 'text', nullable: true, fieldName: 'first_loaded_at' })
  firstLoadedAt!: string | null;
}
