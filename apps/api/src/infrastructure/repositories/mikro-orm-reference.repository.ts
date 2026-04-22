import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ReferenceRepository } from './reference.repository.js';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmFormatEntity,
  FilmStateEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  ReceiverTypeEntity,
  SlotStateEntity,
  StorageLocationEntity
} from '../entities/index.js';
import { mapReferenceTables, mapEmulsionEntity } from '../mappers/index.js';
import type { DevelopmentProcess, FilmFormat, FilmState, HolderType, PackageType, ReceiverType, SlotState, StorageLocation } from '@frollz2/schema';

@Injectable()
export class MikroOrmReferenceRepository extends ReferenceRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async getAll() {
    const [filmFormats, developmentProcesses, packageTypes, filmStates, storageLocations, slotStates, receiverTypes, holderTypes, emulsions] =
      await Promise.all([
        this.entityManager.find(FilmFormatEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(DevelopmentProcessEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(PackageTypeEntity, {}, { populate: ['filmFormat'], orderBy: { id: 'asc' } }),
        this.entityManager.find(FilmStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(StorageLocationEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(SlotStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(ReceiverTypeEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(HolderTypeEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(EmulsionEntity, {}, { populate: ['developmentProcess', 'filmFormats'], orderBy: { id: 'asc' } })
      ]);

    return mapReferenceTables({
      filmFormats,
      developmentProcesses,
      packageTypes,
      filmStates,
      storageLocations,
      slotStates,
      receiverTypes,
      holderTypes,
      emulsions
    });
  }

  async listFilmFormats() {
    return (await this.entityManager.find(FilmFormatEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as FilmFormat['code'],
      label: entity.label
    }));
  }

  async listDevelopmentProcesses() {
    return (await this.entityManager.find(DevelopmentProcessEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as DevelopmentProcess['code'],
      label: entity.label
    }));
  }

  async listPackageTypes() {
    return (await this.entityManager.find(PackageTypeEntity, {}, { populate: ['filmFormat'], orderBy: { id: 'asc' } })).map(
      (entity) => ({
        id: entity.id,
        code: entity.code as PackageType['code'],
        label: entity.label,
        filmFormatId: entity.filmFormat.id,
        filmFormat: {
          id: entity.filmFormat.id,
          code: entity.filmFormat.code as FilmFormat['code'],
          label: entity.filmFormat.label
        }
      })
    );
  }

  async listFilmStates() {
    return (await this.entityManager.find(FilmStateEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as FilmState['code'],
      label: entity.label
    }));
  }

  async listStorageLocations() {
    return (await this.entityManager.find(StorageLocationEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as StorageLocation['code'],
      label: entity.label
    }));
  }

  async listSlotStates() {
    return (await this.entityManager.find(SlotStateEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as SlotState['code'],
      label: entity.label
    }));
  }

  async listReceiverTypes() {
    return (await this.entityManager.find(ReceiverTypeEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as ReceiverType['code'],
      label: entity.label
    }));
  }

  async listHolderTypes() {
    return (await this.entityManager.find(HolderTypeEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as HolderType['code'],
      label: entity.label
    }));
  }

  async listEmulsions() {
    return (await this.entityManager.find(EmulsionEntity, {}, { populate: ['developmentProcess', 'filmFormats'], orderBy: { id: 'asc' } })).map(
      mapEmulsionEntity
    );
  }

  async findEmulsionById(id: number) {
    const entity = await this.entityManager.findOne(EmulsionEntity, { id }, { populate: ['developmentProcess', 'filmFormats'] });

    return entity ? mapEmulsionEntity(entity) : null;
  }
}
