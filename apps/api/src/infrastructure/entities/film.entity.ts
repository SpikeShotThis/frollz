import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { EmulsionEntity, FilmFormatEntity, FilmStateEntity, PackageTypeEntity } from './reference.entities.js';
import { UserEntity } from './user.entity.js';
import { FilmDeviceEntity } from './device.entities.js';
import { FilmLotEntity } from './film-lot.entity.js';

@Entity({ tableName: 'film' })
@Unique({ properties: ['user', 'name'] })
export class FilmEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmLotEntity, { fieldName: 'film_lot_id' })
  filmLot!: FilmLotEntity;

  @Property({ type: 'text' })
  name!: string;

  @ManyToOne(() => EmulsionEntity, { fieldName: 'emulsion_id' })
  emulsion!: EmulsionEntity;

  @ManyToOne(() => PackageTypeEntity, { fieldName: 'package_type_id' })
  packageType!: PackageTypeEntity;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;

  @Property({ type: 'text', nullable: true, fieldName: 'expiration_date' })
  expirationDate!: string | null;

  @ManyToOne(() => FilmStateEntity, { fieldName: 'current_state_id' })
  currentState!: FilmStateEntity;

  @ManyToOne(() => FilmDeviceEntity, { fieldName: 'current_device_id', nullable: true })
  currentDevice: FilmDeviceEntity | null = null;
}
