import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { AutoIncrementEntity } from './base.entity.js';
import { FilmDeviceEntity } from './device.entities.js';
import { UserEntity } from './user.entity.js';

@Entity({ tableName: 'device_mount' })
export class DeviceMountEntity extends AutoIncrementEntity {
  @ManyToOne(() => UserEntity, { fieldName: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => FilmDeviceEntity, { fieldName: 'camera_device_id' })
  cameraDevice!: FilmDeviceEntity;

  @ManyToOne(() => FilmDeviceEntity, { fieldName: 'mounted_device_id' })
  mountedDevice!: FilmDeviceEntity;

  @Property({ type: 'text', fieldName: 'mounted_at' })
  mountedAt!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'unmounted_at' })
  unmountedAt!: string | null;
}
