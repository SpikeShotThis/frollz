import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import {
  FilmFormatEntity,
  HolderTypeEntity,
  DeviceTypeEntity,
  SlotStateEntity
} from './reference.entities.js';
import { UserEntity } from './user.entity.js';
import { FilmEntity } from './film.entity.js';

@Entity({ tableName: 'film_device' })
export class FilmDeviceEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => DeviceTypeEntity, { fieldName: 'device_type_id' })
  deviceType!: DeviceTypeEntity;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;

  @Property({ type: 'text', fieldName: 'frame_size' })
  frameSize!: string;

  @OneToOne(() => CameraEntity, (camera) => camera.filmDevice, { nullable: true })
  camera?: CameraEntity | null;

  @OneToOne(() => InterchangeableBackEntity, (back) => back.filmDevice, { nullable: true })
  interchangeableBack?: InterchangeableBackEntity | null;

  @OneToOne(() => FilmHolderEntity, (holder) => holder.filmDevice, { nullable: true })
  filmHolder?: FilmHolderEntity | null;
}

@Entity({ tableName: 'camera' })
export class CameraEntity {
  @OneToOne(() => FilmDeviceEntity, { primary: true, fieldName: 'film_device_id' })
  filmDevice!: FilmDeviceEntity;

  @Property({ type: 'text' })
  make!: string;

  @Property({ type: 'text' })
  model!: string;

  @Property({ type: 'text', fieldName: 'load_mode' })
  loadMode!: 'direct' | 'interchangeable_back' | 'film_holder';

  @Property({ type: 'boolean', fieldName: 'can_unload' })
  canUnload!: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'camera_system' })
  cameraSystem!: string | null;

  @Property({ type: 'text', nullable: true, fieldName: 'serial_number' })
  serialNumber!: string | null;

  @Property({ type: 'text', nullable: true, fieldName: 'date_acquired' })
  dateAcquired!: string | null;
}

@Entity({ tableName: 'interchangeable_back' })
export class InterchangeableBackEntity {
  @OneToOne(() => FilmDeviceEntity, { primary: true, fieldName: 'film_device_id' })
  filmDevice!: FilmDeviceEntity;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  system!: string;
}

@Entity({ tableName: 'film_holder' })
export class FilmHolderEntity {
  @OneToOne(() => FilmDeviceEntity, { primary: true, fieldName: 'film_device_id' })
  filmDevice!: FilmDeviceEntity;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  brand!: string;

  @Property({ type: 'integer', fieldName: 'slot_count' })
  slotCount!: 1 | 2;

  @ManyToOne(() => HolderTypeEntity, { fieldName: 'holder_type_id' })
  holderType!: HolderTypeEntity;

  @OneToMany(() => FilmHolderSlotEntity, (slot) => slot.filmHolder)
  slots = new Collection<FilmHolderSlotEntity>(this);
}

@Entity({ tableName: 'film_holder_slot' })
export class FilmHolderSlotEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmHolderEntity, { fieldName: 'film_device_id' })
  filmHolder!: FilmHolderEntity;

  @Property({ type: 'integer', fieldName: 'side_number' })
  sideNumber!: number;

  @ManyToOne(() => SlotStateEntity, { fieldName: 'slot_state_id' })
  slotState!: SlotStateEntity;

  @Property({ type: 'text', fieldName: 'slot_state_code' })
  slotStateCode!: string;

  @ManyToOne(() => FilmEntity, { nullable: true, fieldName: 'loaded_film_id' })
  loadedFilm!: Rel<FilmEntity> | null;

  @Property({ type: 'text', fieldName: 'created_at' })
  createdAt!: string;
}
