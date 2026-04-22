import { Collection } from '@mikro-orm/core';
import { Entity, ManyToMany, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';

@Entity({ tableName: 'film_format' })
@Unique({ properties: ['code'] })
export class FilmFormatEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'development_process' })
@Unique({ properties: ['code'] })
export class DevelopmentProcessEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'package_type' })
@Unique({ properties: ['filmFormat', 'code'] })
export class PackageTypeEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;

  @ManyToOne(() => FilmFormatEntity, { fieldName: 'film_format_id' })
  filmFormat!: FilmFormatEntity;
}

@Entity({ tableName: 'film_state' })
@Unique({ properties: ['code'] })
export class FilmStateEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'storage_location' })
@Unique({ properties: ['code'] })
export class StorageLocationEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'slot_state' })
@Unique({ properties: ['code'] })
export class SlotStateEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'device_type' })
@Unique({ properties: ['code'] })
export class DeviceTypeEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'holder_type' })
@Unique({ properties: ['code'] })
export class HolderTypeEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  code!: string;

  @Property({ type: 'text' })
  label!: string;
}

@Entity({ tableName: 'emulsion' })
@Unique({ properties: ['brand', 'manufacturer', 'isoSpeed'] })
export class EmulsionEntity extends AutoIncrementEntity {
  @Property({ type: 'text' })
  brand!: string;

  @Property({ type: 'text' })
  manufacturer!: string;

  @Property({ type: 'integer', fieldName: 'iso_speed' })
  isoSpeed!: number;

  @ManyToOne(() => DevelopmentProcessEntity, { fieldName: 'development_process_id' })
  developmentProcess!: DevelopmentProcessEntity;

  @Property({ type: 'text' })
  balance!: string;

  @ManyToMany(() => FilmFormatEntity, undefined, {
    owner: true,
    pivotTable: 'emulsion_film_format'
  })
  filmFormats = new Collection<FilmFormatEntity>(this);
}
