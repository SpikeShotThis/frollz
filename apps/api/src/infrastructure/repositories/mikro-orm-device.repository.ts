import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { DeviceRepository } from './device.repository.js';
import {
  CameraEntity,
  FilmFormatEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmDeviceEntity,
  HolderTypeEntity,
  InterchangeableBackEntity,
  DeviceTypeEntity,
  UserEntity
} from '../entities/index.js';
import { mapFilmHolderSlotEntity, mapFilmDeviceEntity } from '../mappers/index.js';

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
        populate: [
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
        ],
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
        populate: [
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
        ]
      }
    );

    return device ? mapFilmDeviceEntity(device) : null;
  }

  async create(userId: number, input: { deviceTypeCode: 'camera' | 'interchangeable_back' | 'film_holder'; deviceTypeId: number; filmFormatId: number; frameSize: string;[key: string]: unknown }) {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const deviceType = transactionalEntityManager.getReference(DeviceTypeEntity, input.deviceTypeId);
      const filmFormat = transactionalEntityManager.getReference(FilmFormatEntity, input.filmFormatId);

      const base = transactionalEntityManager.create(FilmDeviceEntity, {
        user,
        deviceType,
        filmFormat,
        frameSize: input.frameSize
      });

      transactionalEntityManager.persist(base);
      await transactionalEntityManager.flush();

      if (input.deviceTypeCode === 'camera') {
        const camera = transactionalEntityManager.create(CameraEntity, {
          filmDevice: base,
          make: String(input.make),
          model: String(input.model),
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
          holderType
        });
        transactionalEntityManager.persist(filmHolder);
        await transactionalEntityManager.flush();
      }

      const persisted = await transactionalEntityManager.findOneOrFail(
        FilmDeviceEntity,
        { id: base.id, user: userId },
        {
          populate: [
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
          ]
        }
      );

      return mapFilmDeviceEntity(persisted);
    });
  }

  async update(userId: number, deviceId: number, input: { filmFormatId?: number; frameSize?: string; make?: string; model?: string; serialNumber?: string | null; dateAcquired?: string | null; name?: string; system?: string; brand?: string; holderTypeId?: number }) {
    const device = await this.entityManager.findOne(
      FilmDeviceEntity,
      { id: deviceId, user: userId },
      { populate: ['camera', 'interchangeableBack', 'filmHolder', 'filmHolder.holderType', 'filmHolder.slots', 'filmHolder.slots.slotState', 'filmHolder.slots.loadedFilm'] }
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
        populate: [
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
        ]
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
      { populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'], orderBy: { sideNumber: 'asc', createdAt: 'asc', id: 'asc' } }
    );

    return slots.map(mapFilmHolderSlotEntity);
  }

  async findActiveHolderSlot(userId: number, filmDeviceId: number, sideNumber: number) {
    const slot = await this.entityManager.findOne(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmDevice: filmDeviceId }, sideNumber },
      { populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'], orderBy: { createdAt: 'desc', id: 'desc' } }
    );

    return slot ? mapFilmHolderSlotEntity(slot) : null;
  }
}
