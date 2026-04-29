import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateEmulsionRequest, DevelopmentProcess, FilmFormat, FilmState, HolderType, PackageType, DeviceType, SlotState, StorageLocation } from '@frollz2/schema';
import { ReferenceRepository } from './reference.repository.js';
import { DomainError } from '../../domain/errors.js';
import {
  DevelopmentProcessEntity,
  EmulsionEntity,
  FilmFormatEntity,
  FilmStateEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  DeviceTypeEntity,
  SlotStateEntity,
  StorageLocationEntity
} from '../entities/index.js';
import { mapReferenceTables, mapEmulsionEntity } from '../mappers/index.js';

@Injectable()
export class MikroOrmReferenceRepository extends ReferenceRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async getAll() {
    const [filmFormats, developmentProcesses, packageTypes, filmStates, storageLocations, slotStates, deviceTypes, holderTypes, emulsions] =
      await Promise.all([
        this.entityManager.find(FilmFormatEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(DevelopmentProcessEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(PackageTypeEntity, {}, { populate: ['filmFormat'], orderBy: { id: 'asc' } }),
        this.entityManager.find(FilmStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(StorageLocationEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(SlotStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(DeviceTypeEntity, {}, { orderBy: { id: 'asc' } }),
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
      deviceTypes,
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

  async listDeviceTypes() {
    return (await this.entityManager.find(DeviceTypeEntity, {}, { orderBy: { id: 'asc' } })).map((entity) => ({
      id: entity.id,
      code: entity.code as DeviceType['code'],
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

  async createEmulsion(input: CreateEmulsionRequest) {
    const developmentProcess = await this.entityManager.findOne(DevelopmentProcessEntity, { id: input.developmentProcessId });
    if (!developmentProcess) {
      throw new DomainError('NOT_FOUND', 'Development process not found');
    }

    const formats = await this.entityManager.find(FilmFormatEntity, { id: { $in: input.filmFormatIds } }, { orderBy: { id: 'asc' } });
    if (formats.length !== new Set(input.filmFormatIds).size) {
      throw new DomainError('NOT_FOUND', 'One or more film formats were not found');
    }

    try {
      const entity = this.entityManager.create(EmulsionEntity, {
        brand: input.brand.trim(),
        manufacturer: input.manufacturer.trim(),
        isoSpeed: input.isoSpeed,
        developmentProcess,
        balance: 'daylight'
      });
      for (const format of formats) {
        entity.filmFormats.add(format);
      }
      this.entityManager.persist(entity);
      await this.entityManager.flush();

      const persisted = await this.entityManager.findOneOrFail(
        EmulsionEntity,
        { id: entity.id },
        { populate: ['developmentProcess', 'filmFormats'] }
      );

      return mapEmulsionEntity(persisted);
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new DomainError('CONFLICT', 'An emulsion with that brand, manufacturer, and ISO already exists');
      }
      throw error;
    }
  }
}
