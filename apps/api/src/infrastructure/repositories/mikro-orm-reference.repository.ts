import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  DevelopmentProcess,
  DeviceType,
  FilmFormat,
  FilmState,
  HolderType,
  ListReferenceValuesQuery,
  PackageType,
  ReferenceValue,
  SlotState,
  StorageLocation,
  UpsertReferenceValueInput
} from '@frollz2/schema';
import { ReferenceRepository } from './reference.repository.js';
import {
  DevelopmentProcessEntity,
  FilmFormatEntity,
  FilmStateEntity,
  HolderTypeEntity,
  PackageTypeEntity,
  DeviceTypeEntity,
  SlotStateEntity,
  StorageLocationEntity,
  ReferenceValueEntity,
  UserEntity
} from '../entities/index.js';
import { mapReferenceTables } from '../mappers/index.js';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../../domain/reference/reference-value.utils.js';
import { nowIso } from '../../common/utils/time.js';

@Injectable()
export class MikroOrmReferenceRepository extends ReferenceRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async getAll() {
    const [filmFormats, developmentProcesses, packageTypes, filmStates, storageLocations, slotStates, deviceTypes, holderTypes] =
      await Promise.all([
        this.entityManager.find(FilmFormatEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(DevelopmentProcessEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(PackageTypeEntity, {}, { populate: ['filmFormat'], orderBy: { id: 'asc' } }),
        this.entityManager.find(FilmStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(StorageLocationEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(SlotStateEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(DeviceTypeEntity, {}, { orderBy: { id: 'asc' } }),
        this.entityManager.find(HolderTypeEntity, {}, { orderBy: { id: 'asc' } })
      ]);

    return mapReferenceTables({
      filmFormats,
      developmentProcesses,
      packageTypes,
      filmStates,
      storageLocations,
      slotStates,
      deviceTypes,
      holderTypes
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

  async listReferenceValues(userId: number, query: ListReferenceValuesQuery): Promise<ReferenceValue[]> {
    const normalizedQuery = normalizeReferenceValue(query.q ?? '');
    const values = await this.entityManager.find(
      ReferenceValueEntity,
      {
        user: userId,
        kind: query.kind,
        ...(normalizedQuery.length > 0 ? { normalizedValue: { $like: `${normalizedQuery}%` } } : {})
      },
      {
        orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }, { id: 'desc' }],
        limit: query.limit
      }
    );

    return values.map((entity) => ({
      id: entity.id,
      userId,
      kind: entity.kind as ReferenceValue['kind'],
      value: entity.value,
      normalizedValue: entity.normalizedValue,
      usageCount: entity.usageCount,
      lastUsedAt: entity.lastUsedAt
    }));
  }

  async upsertReferenceValues(userId: number, values: UpsertReferenceValueInput[]): Promise<void> {
    if (values.length === 0) {
      return;
    }

    const at = nowIso();
    await this.entityManager.transactional(async (em) => {
      for (const item of values) {
        const value = sanitizeReferenceValue(item.value);
        if (!value) {
          continue;
        }

        const normalizedValue = normalizeReferenceValue(value);
        const existing = await em.findOne(ReferenceValueEntity, {
          user: userId,
          kind: item.kind,
          normalizedValue
        });

        if (existing) {
          existing.usageCount += 1;
          existing.lastUsedAt = at;
          existing.value = value;
          em.persist(existing);
          continue;
        }

        const referenceValue = em.create(ReferenceValueEntity, {
          user: em.getReference(UserEntity, userId),
          kind: item.kind,
          value,
          normalizedValue,
          usageCount: 1,
          lastUsedAt: at
        });
        em.persist(referenceValue);
      }
      await em.flush();
    });
  }

}
