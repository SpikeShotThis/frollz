import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import {
  FilmFormatEntity,
  HolderTypeEntity,
  ReceiverTypeEntity,
  SlotStateEntity
} from './reference.entities.js';
import { UserEntity } from './user.entity.js';
import { FilmEntity } from './film.entity.js';

@Entity({ tableName: 'film_receiver' })
export class FilmReceiverEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ReceiverTypeEntity, { fieldName: 'receiver_type_id' })
  receiverType!: ReceiverTypeEntity;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;

  @Property({ type: 'text', fieldName: 'frame_size' })
  frameSize!: string;

  @OneToOne(() => CameraEntity, (camera) => camera.filmReceiver, { nullable: true })
  camera?: CameraEntity | null;

  @OneToOne(() => InterchangeableBackEntity, (back) => back.filmReceiver, { nullable: true })
  interchangeableBack?: InterchangeableBackEntity | null;

  @OneToOne(() => FilmHolderEntity, (holder) => holder.filmReceiver, { nullable: true })
  filmHolder?: FilmHolderEntity | null;
}

@Entity({ tableName: 'camera' })
export class CameraEntity {
  @OneToOne(() => FilmReceiverEntity, { primary: true, fieldName: 'film_receiver_id' })
  filmReceiver!: FilmReceiverEntity;

  @Property({ type: 'text' })
  make!: string;

  @Property({ type: 'text' })
  model!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'serial_number' })
  serialNumber!: string | null;

  @Property({ type: 'text', nullable: true, fieldName: 'date_acquired' })
  dateAcquired!: string | null;
}

@Entity({ tableName: 'interchangeable_back' })
export class InterchangeableBackEntity {
  @OneToOne(() => FilmReceiverEntity, { primary: true, fieldName: 'film_receiver_id' })
  filmReceiver!: FilmReceiverEntity;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  system!: string;
}

@Entity({ tableName: 'film_holder' })
export class FilmHolderEntity {
  @OneToOne(() => FilmReceiverEntity, { primary: true, fieldName: 'film_receiver_id' })
  filmReceiver!: FilmReceiverEntity;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  brand!: string;

  @ManyToOne(() => HolderTypeEntity, { fieldName: 'holder_type_id' })
  holderType!: HolderTypeEntity;

  @OneToMany(() => FilmHolderSlotEntity, (slot) => slot.filmHolder)
  slots = new Collection<FilmHolderSlotEntity>(this);
}

@Entity({ tableName: 'film_holder_slot' })
export class FilmHolderSlotEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmHolderEntity, { fieldName: 'film_receiver_id' })
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
