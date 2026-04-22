import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ReceiverRepository } from './receiver.repository.js';
import {
  CameraEntity,
  FilmFormatEntity,
  FilmHolderEntity,
  FilmHolderSlotEntity,
  FilmReceiverEntity,
  HolderTypeEntity,
  InterchangeableBackEntity,
  ReceiverTypeEntity,
  UserEntity
} from '../entities/index.js';
import { mapFilmHolderSlotEntity, mapFilmReceiverEntity } from '../mappers/index.js';

@Injectable()
export class MikroOrmReceiverRepository extends ReceiverRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number) {
    const receivers = await this.entityManager.find(
      FilmReceiverEntity,
      { user: userId },
      {
        populate: [
          'user',
          'receiverType',
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

    return receivers.map(mapFilmReceiverEntity);
  }

  async findById(userId: number, receiverId: number) {
    const receiver = await this.entityManager.findOne(
      FilmReceiverEntity,
      { id: receiverId, user: userId },
      {
        populate: [
          'user',
          'receiverType',
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

    return receiver ? mapFilmReceiverEntity(receiver) : null;
  }

  async create(userId: number, input: { receiverTypeCode: 'camera' | 'interchangeable_back' | 'film_holder'; receiverTypeId: number; filmFormatId: number; frameSize: string;[key: string]: unknown }) {
    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const user = transactionalEntityManager.getReference(UserEntity, userId);
      const receiverType = transactionalEntityManager.getReference(ReceiverTypeEntity, input.receiverTypeId);
      const filmFormat = transactionalEntityManager.getReference(FilmFormatEntity, input.filmFormatId);

      const base = transactionalEntityManager.create(FilmReceiverEntity, {
        user,
        receiverType,
        filmFormat,
        frameSize: input.frameSize
      });

      transactionalEntityManager.persist(base);
      await transactionalEntityManager.flush();

      if (input.receiverTypeCode === 'camera') {
        const camera = transactionalEntityManager.create(CameraEntity, {
          filmReceiver: base,
          make: String(input.make),
          model: String(input.model),
          serialNumber: input.serialNumber ? String(input.serialNumber) : null,
          dateAcquired: input.dateAcquired ? String(input.dateAcquired) : null
        });
        transactionalEntityManager.persist(camera);
        await transactionalEntityManager.flush();
      }

      if (input.receiverTypeCode === 'interchangeable_back') {
        const interchangeableBack = transactionalEntityManager.create(InterchangeableBackEntity, {
          filmReceiver: base,
          name: String(input.name),
          system: String(input.system)
        });
        transactionalEntityManager.persist(interchangeableBack);
        await transactionalEntityManager.flush();
      }

      if (input.receiverTypeCode === 'film_holder') {
        const holderType = transactionalEntityManager.getReference(HolderTypeEntity, Number(input.holderTypeId));
        const filmHolder = transactionalEntityManager.create(FilmHolderEntity, {
          filmReceiver: base,
          name: String(input.name),
          brand: String(input.brand),
          holderType
        });
        transactionalEntityManager.persist(filmHolder);
        await transactionalEntityManager.flush();
      }

      const persisted = await transactionalEntityManager.findOneOrFail(
        FilmReceiverEntity,
        { id: base.id, user: userId },
        {
          populate: [
            'user',
            'receiverType',
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

      return mapFilmReceiverEntity(persisted);
    });
  }

  async update(userId: number, receiverId: number, input: { filmFormatId?: number; frameSize?: string; make?: string; model?: string; serialNumber?: string | null; dateAcquired?: string | null; name?: string; system?: string; brand?: string; holderTypeId?: number }) {
    const receiver = await this.entityManager.findOne(
      FilmReceiverEntity,
      { id: receiverId, user: userId },
      { populate: ['camera', 'interchangeableBack', 'filmHolder', 'filmHolder.holderType', 'filmHolder.slots', 'filmHolder.slots.slotState', 'filmHolder.slots.loadedFilm'] }
    );

    if (!receiver) {
      return null;
    }

    if (input.filmFormatId !== undefined) {
      receiver.filmFormat = this.entityManager.getReference(FilmFormatEntity, input.filmFormatId);
    }

    if (input.frameSize !== undefined) {
      receiver.frameSize = input.frameSize;
    }

    if (receiver.camera) {
      if (input.make !== undefined) {
        receiver.camera.make = input.make;
      }
      if (input.model !== undefined) {
        receiver.camera.model = input.model;
      }
      if (input.serialNumber !== undefined) {
        receiver.camera.serialNumber = input.serialNumber;
      }
      if (input.dateAcquired !== undefined) {
        receiver.camera.dateAcquired = input.dateAcquired;
      }
    }

    if (receiver.interchangeableBack) {
      if (input.name !== undefined) {
        receiver.interchangeableBack.name = input.name;
      }
      if (input.system !== undefined) {
        receiver.interchangeableBack.system = input.system;
      }
    }

    if (receiver.filmHolder) {
      if (input.name !== undefined) {
        receiver.filmHolder.name = input.name;
      }
      if (input.brand !== undefined) {
        receiver.filmHolder.brand = input.brand;
      }
      if (input.holderTypeId !== undefined) {
        receiver.filmHolder.holderType = this.entityManager.getReference(HolderTypeEntity, input.holderTypeId);
      }
    }

    this.entityManager.persist(receiver);
    await this.entityManager.flush();

    const persisted = await this.entityManager.findOneOrFail(
      FilmReceiverEntity,
      { id: receiverId, user: userId },
      {
        populate: [
          'user',
          'receiverType',
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

    return mapFilmReceiverEntity(persisted);
  }

  async delete(userId: number, receiverId: number) {
    const receiver = await this.entityManager.findOne(
      FilmReceiverEntity,
      { id: receiverId, user: userId },
      { populate: ['camera', 'interchangeableBack', 'filmHolder'] }
    );

    if (!receiver) {
      return;
    }

    await this.entityManager.transactional(async (transactionalEntityManager) => {
      if (receiver.camera) {
        await transactionalEntityManager.nativeDelete(CameraEntity, { filmReceiver: receiver.id });
      }
      if (receiver.interchangeableBack) {
        await transactionalEntityManager.nativeDelete(InterchangeableBackEntity, { filmReceiver: receiver.id });
      }
      if (receiver.filmHolder) {
        await transactionalEntityManager.nativeDelete(FilmHolderSlotEntity, { filmHolder: receiver.filmHolder });
        await transactionalEntityManager.nativeDelete(FilmHolderEntity, { filmReceiver: receiver.id });
      }
      await transactionalEntityManager.nativeDelete(FilmReceiverEntity, { id: receiver.id, user: userId });
    });
  }

  async listHolderSlots(userId: number, filmReceiverId: number) {
    const slots = await this.entityManager.find(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmReceiver: filmReceiverId } },
      { populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'], orderBy: { sideNumber: 'asc', createdAt: 'asc', id: 'asc' } }
    );

    return slots.map(mapFilmHolderSlotEntity);
  }

  async findActiveHolderSlot(userId: number, filmReceiverId: number, sideNumber: number) {
    const slot = await this.entityManager.findOne(
      FilmHolderSlotEntity,
      { user: userId, filmHolder: { filmReceiver: filmReceiverId }, sideNumber },
      { populate: ['user', 'filmHolder', 'slotState', 'loadedFilm'], orderBy: { createdAt: 'desc', id: 'desc' } }
    );

    return slot ? mapFilmHolderSlotEntity(slot) : null;
  }
}
