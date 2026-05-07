import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, ForeignKeyConstraintViolationException, UniqueConstraintViolationException } from '@mikro-orm/core';
import type { CreateEmulsionRequest, UpdateEmulsionRequest } from '@frollz2/schema';
import { DomainError } from '../../domain/errors.js';
import { DevelopmentProcessEntity, EmulsionEntity, FilmEntity, FilmFormatEntity } from '../entities/index.js';
import { mapEmulsionEntity } from '../mappers/index.js';
import { EmulsionRepository } from './emulsion.repository.js';

@Injectable()
export class MikroOrmEmulsionRepository extends EmulsionRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list() {
    return (await this.entityManager.find(EmulsionEntity, {}, { populate: ['developmentProcess', 'filmFormats'], orderBy: { id: 'asc' } })).map(
      mapEmulsionEntity
    );
  }

  async findById(id: number) {
    const entity = await this.entityManager.findOne(EmulsionEntity, { id }, { populate: ['developmentProcess', 'filmFormats'] });
    return entity ? mapEmulsionEntity(entity) : null;
  }

  async create(input: CreateEmulsionRequest) {
    const developmentProcess = await this.entityManager.findOne(DevelopmentProcessEntity, { id: input.developmentProcessId });
    if (!developmentProcess) {
      throw new DomainError('NOT_FOUND', 'Development process not found', { label: 'errors.emulsions.developmentProcessNotFound' });
    }

    const formats = await this.entityManager.find(FilmFormatEntity, { id: { $in: input.filmFormatIds } }, { orderBy: { id: 'asc' } });
    if (formats.length !== new Set(input.filmFormatIds).size) {
      throw new DomainError('NOT_FOUND', 'One or more film formats were not found', { label: 'errors.emulsions.formatsNotFound' });
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
        throw new DomainError('CONFLICT', 'An emulsion with that brand, manufacturer, and ISO already exists', { label: 'errors.emulsions.duplicate' });
      }
      throw error;
    }
  }

  async update(id: number, input: UpdateEmulsionRequest) {
    const entity = await this.entityManager.findOne(EmulsionEntity, { id }, { populate: ['filmFormats'] });
    if (!entity) {
      return null;
    }

    const developmentProcess = await this.entityManager.findOne(DevelopmentProcessEntity, { id: input.developmentProcessId });
    if (!developmentProcess) {
      throw new DomainError('NOT_FOUND', 'Development process not found', { label: 'errors.emulsions.developmentProcessNotFound' });
    }

    const formats = await this.entityManager.find(FilmFormatEntity, { id: { $in: input.filmFormatIds } }, { orderBy: { id: 'asc' } });
    if (formats.length !== new Set(input.filmFormatIds).size) {
      throw new DomainError('NOT_FOUND', 'One or more film formats were not found', { label: 'errors.emulsions.formatsNotFound' });
    }

    entity.brand = input.brand.trim();
    entity.manufacturer = input.manufacturer.trim();
    entity.isoSpeed = input.isoSpeed;
    entity.developmentProcess = developmentProcess;
    entity.filmFormats.set(formats);

    try {
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
        throw new DomainError('CONFLICT', 'An emulsion with that brand, manufacturer, and ISO already exists', { label: 'errors.emulsions.duplicate' });
      }
      throw error;
    }
  }

  async delete(id: number) {
    const entity = await this.entityManager.findOne(EmulsionEntity, { id });
    if (!entity) {
      return false;
    }

    try {
      this.entityManager.remove(entity);
      await this.entityManager.flush();
      return true;
    } catch (error) {
      if (error instanceof ForeignKeyConstraintViolationException) {
        throw new DomainError('CONFLICT', 'Emulsion cannot be deleted because it is in use by existing films', { label: 'errors.emulsions.inUse' });
      }
      throw error;
    }
  }

  async isInUse(id: number) {
    const count = await this.entityManager.count(FilmEntity, { emulsion: id });
    return count > 0;
  }
}
