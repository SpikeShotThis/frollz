import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { CreateFilmDeviceRequest, UpdateFilmDeviceRequest } from '@frollz2/schema';
import { DeviceRepository } from './device.repository.js';
import {
  CameraEntity,
  DeviceMountEntity,
  FilmFormatEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmDeviceEntity,
  HolderTypeEntity,
  InterchangeableBackEntity,
  DeviceTypeEntity,
  UserEntity
} from '../entities/index.js';
import { mapDeviceMountEntity, mapFilmHolderSlotEntity, mapFilmDeviceEntity } from '../mappers/index.js';
import { nowIso } from '../../common/utils/time.js';

const DEVICE_DETAIL_POPULATE = [
  'user',
  'deviceType',
  'filmFormat',
  'camera',
  'interchangeableBack',
  'filmHolder',
  'filmHolder.holderType',
  'filmHolder.slots',
  'filmHolder.slots.slotState',
  'filmHolder.slots.loadedFilm'
] as const;

const DEVICE_EDIT_POPULATE = [
  'camera',
  'interchangeableBack',
  'filmHolder',
  'filmHolder.holderType',
  'filmHolder.slots',
  'filmHolder.slots.slotState',
  'filmHolder.slots.loadedFilm'
] as const;

const HOLDER_SLOT_POPULATE = ['user', 'filmHolder', 'slotState', 'loadedFilm'] as const;
const DEVICE_MOUNT_POPULATE = ['user', 'cameraDevice', 'mountedDevice'] as const;

@Injectable()
export class MikroOrmDeviceRepository extends DeviceRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number) {
    const devices = await this.entityManager.find(
      FilmDeviceEntity,
      { user: userId },
      {
        populate: DEVICE_DETAIL_POPULATE,
        orderBy: { id: 'asc' }
      }
    );

    return devices.map(mapFilmDeviceEntity);
  }

  async findById(userId: number, deviceId: number) {
    const device = await this.entityManager.findOne(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      {
        populate: DEVICE_DETAIL_POPULATE
      }
    );

    return device ? mapFilmDeviceEntity(device) : null;
  }

  async create(userId: number, input: CreateFilmDeviceRequest) {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const deviceType = transactionalEntityManager.getReference(DeviceTypeEntity, input.deviceTypeId);
      const filmFormat = transactionalEntityManager.getReference(FilmFormatEntity, input.filmFormatId);

      const base = transactionalEntityManager.create(FilmDeviceEntity, {
        user,
        deviceType,
        filmFormat,
        frameSize: input.frameSize ?? null
      });

      transactionalEntityManager.persist(base);
      await transactionalEntityManager.flush();

      if (input.deviceTypeCode === 'camera') {
        const camera = transactionalEntityManager.create(CameraEntity, {
          filmDevice: base,
          make: String(input.make),
          model: String(input.model),
          loadMode: (input.loadMode as 'direct' | 'interchangeable_back' | 'film_holder') ?? 'direct',
          canUnload: typeof input.canUnload === 'boolean' ? input.canUnload : true,
          cameraSystem: input.cameraSystem ? String(input.cameraSystem) : null,
          serialNumber: input.serialNumber ? String(input.serialNumber) : null,
          dateAcquired: input.dateAcquired ? String(input.dateAcquired) : null
        });
        transactionalEntityManager.persist(camera);
        await transactionalEntityManager.flush();
      }

      if (input.deviceTypeCode === 'interchangeable_back') {
        const interchangeableBack = transactionalEntityManager.create(InterchangeableBackEntity, {
          filmDevice: base,
          name: String(input.name),
          system: String(input.system)
        });
        transactionalEntityManager.persist(interchangeableBack);
        await transactionalEntityManager.flush();
      }

      if (input.deviceTypeCode === 'film_holder') {
        const holderType = transactionalEntityManager.getReference(HolderTypeEntity, Number(input.holderTypeId));
        const filmHolder = transactionalEntityManager.create(FilmHolderEntity, {
          filmDevice: base,
          name: String(input.name),
          brand: String(input.brand),
          slotCount: (Number(input.slotCount) === 1 ? 1 : 2) as 1 | 2,
          holderType
        });
        transactionalEntityManager.persist(filmHolder);
        await transactionalEntityManager.flush();
      }

      const persisted = await transactionalEntityManager.findOneOrFail(
        FilmDeviceEntity,
        { id: base.id, user: userId },
        {
          populate: DEVICE_DETAIL_POPULATE
        }
      );

      return mapFilmDeviceEntity(persisted);
    });
  }

  async update(
    userId: number,
    deviceId: number,
    input: UpdateFilmDeviceRequest
  ) {
    const device = await this.entityManager.findOne(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      { populate: DEVICE_EDIT_POPULATE }
    );

    if (!device) {
      return null;
    }

    if (input.filmFormatId !== undefined) {
      device.filmFormat = this.entityManager.getReference(FilmFormatEntity, input.filmFormatId);
    }

    if (input.frameSize !== undefined) {
      device.frameSize = input.frameSize;
    }

    if (device.camera) {
      if (input.make !== undefined) {
        device.camera.make = input.make;
      }
      if (input.model !== undefined) {
        device.camera.model = input.model;
      }
      if (input.loadMode !== undefined) {
        device.camera.loadMode = input.loadMode;
      }
      if (input.canUnload !== undefined) {
        device.camera.canUnload = input.canUnload;
      }
      if (input.cameraSystem !== undefined) {
        device.camera.cameraSystem = input.cameraSystem;
      }
      if (input.serialNumber !== undefined) {
        device.camera.serialNumber = input.serialNumber;
      }
      if (input.dateAcquired !== undefined) {
        device.camera.dateAcquired = input.dateAcquired;
      }
    }

    if (device.interchangeableBack) {
      if (input.name !== undefined) {
        device.interchangeableBack.name = input.name;
      }
      if (input.system !== undefined) {
        device.interchangeableBack.system = input.system;
      }
    }

    if (device.filmHolder) {
      if (input.name !== undefined) {
        device.filmHolder.name = input.name;
      }
      if (input.brand !== undefined) {
        device.filmHolder.brand = input.brand;
      }
      if (input.slotCount !== undefined) {
        device.filmHolder.slotCount = input.slotCount;
      }
      if (input.holderTypeId !== undefined) {
        device.filmHolder.holderType = this.entityManager.getReference(HolderTypeEntity, input.holderTypeId);
      }
    }

    this.entityManager.persist(device);
    await this.entityManager.flush();

    const persisted = await this.entityManager.findOneOrFail(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      {
        populate: DEVICE_DETAIL_POPULATE
      }
    );

    return mapFilmDeviceEntity(persisted);
  }

  async delete(userId: number, deviceId: number) {
    const device = await this.entityManager.findOne(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      { populate: ['camera', 'interchangeableBack', 'filmHolder'] }
    );

    if (!device) {
      return;
    }

    await this.entityManager.transactional(async (transactionalEntityManager) => {
      if (device.camera) {
        await transactionalEntityManager.nativeDelete(CameraEntity, { filmDevice: device.id });
      }
      if (device.interchangeableBack) {
        await transactionalEntityManager.nativeDelete(InterchangeableBackEntity, { filmDevice: device.id });
      }
      if (device.filmHolder) {
        await transactionalEntityManager.nativeDelete(FilmHolderSlotEntity, { filmHolder: device.filmHolder });
        await transactionalEntityManager.nativeDelete(FilmHolderEntity, { filmDevice: device.id });
      }
      await transactionalEntityManager.nativeDelete(FilmDeviceEntity, { id: device.id, user: userId });
    });
  }

  async listHolderSlots(userId: number, filmDeviceId: number) {
    const slots = await this.entityManager.find(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmDevice: filmDeviceId } },
      { populate: HOLDER_SLOT_POPULATE, orderBy: { sideNumber: 'asc', createdAt: 'asc', id: 'asc' } }
    );

    return slots.map(mapFilmHolderSlotEntity);
  }

  async findActiveHolderSlot(userId: number, filmDeviceId: number, sideNumber: number) {
    const slot = await this.entityManager.findOne(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmDevice: filmDeviceId }, sideNumber },
      { populate: HOLDER_SLOT_POPULATE, orderBy: { createdAt: 'desc', id: 'desc' } }
    );

    return slot ? mapFilmHolderSlotEntity(slot) : null;
  }

  async listMountsForCamera(userId: number, cameraDeviceId: number) {
    const mounts = await this.entityManager.find(
      DeviceMountEntity,
      { user: userId, cameraDevice: cameraDeviceId },
      { populate: DEVICE_MOUNT_POPULATE, orderBy: { mountedAt: 'desc', id: 'desc' } }
    );

    return mounts.map(mapDeviceMountEntity);
  }

  async createMount(
    userId: number,
    cameraDeviceId: number,
    input: { mountedDeviceId: number; mountedAt?: string | undefined }
  ) {
    const user = this.entityManager.getReference(UserEntity, userId);
    const cameraDevice = this.entityManager.getReference(FilmDeviceEntity, cameraDeviceId);
    const mountedDevice = this.entityManager.getReference(FilmDeviceEntity, input.mountedDeviceId);

    const mount = this.entityManager.create(DeviceMountEntity, {
      user,
      cameraDevice,
      mountedDevice,
      mountedAt: input.mountedAt ?? nowIso(),
      unmountedAt: null
    });

    this.entityManager.persist(mount);
    await this.entityManager.flush();

    const persisted = await this.entityManager.findOneOrFail(
      DeviceMountEntity,
      { id: mount.id },
      { populate: DEVICE_MOUNT_POPULATE }
    );
    return mapDeviceMountEntity(persisted);
  }

  async unmount(
    userId: number,
    cameraDeviceId: number,
    input: { mountedDeviceId: number; unmountedAt?: string | undefined }
  ) {
    const activeMount = await this.entityManager.findOne(
      DeviceMountEntity,
      {
        user: userId,
        cameraDevice: cameraDeviceId,
        mountedDevice: input.mountedDeviceId,
        unmountedAt: null
      },
      { populate: DEVICE_MOUNT_POPULATE, orderBy: { mountedAt: 'desc', id: 'desc' } }
    );

    if (!activeMount) {
      return null;
    }

    activeMount.unmountedAt = input.unmountedAt ?? nowIso();
    this.entityManager.persist(activeMount);
    await this.entityManager.flush();

    return mapDeviceMountEntity(activeMount);
  }

  async findActiveMountForCamera(userId: number, cameraDeviceId: number) {
    const mount = await this.entityManager.findOne(
      DeviceMountEntity,
      { user: userId, cameraDevice: cameraDeviceId, unmountedAt: null },
      { populate: DEVICE_MOUNT_POPULATE, orderBy: { mountedAt: 'desc', id: 'desc' } }
    );
    return mount ? mapDeviceMountEntity(mount) : null;
  }

  async findActiveMountForMountedDevice(userId: number, mountedDeviceId: number) {
    const mount = await this.entityManager.findOne(
      DeviceMountEntity,
      { user: userId, mountedDevice: mountedDeviceId, unmountedAt: null },
      { populate: DEVICE_MOUNT_POPULATE, orderBy: { mountedAt: 'desc', id: 'desc' } }
    );
    return mount ? mapDeviceMountEntity(mount) : null;
  }
}
