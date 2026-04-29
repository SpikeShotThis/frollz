import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { CreateFilmSupplierRequest, FilmSupplier, ListFilmSuppliersQuery, UpdateFilmSupplierRequest } from '@frollz2/schema';
import { FilmSupplierRepository } from './film-supplier.repository.js';
import { FilmSupplierEntity, UserEntity } from '../entities/index.js';
import { mapFilmSupplierEntity } from '../mappers/index.js';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../../domain/reference/reference-value.utils.js';

@Injectable()
export class MikroOrmFilmSupplierRepository extends FilmSupplierRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number, query: ListFilmSuppliersQuery): Promise<FilmSupplier[]> {
    const normalizedQuery = normalizeReferenceValue(query.q);
    const entities = await this.entityManager.find(
      FilmSupplierEntity,
      {
        user: userId,
        ...(query.includeInactive ? {} : { active: true }),
        ...(normalizedQuery.length > 0 ? { normalizedName: { $like: `${normalizedQuery}%` } } : {})
      },
      { orderBy: [{ active: 'desc' }, { name: 'asc' }], limit: query.limit, populate: ['user'] }
    );

    return entities.map(mapFilmSupplierEntity);
  }

  async findById(userId: number, supplierId: number): Promise<FilmSupplier | null> {
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { id: supplierId, user: userId }, { populate: ['user'] });
    return entity ? mapFilmSupplierEntity(entity) : null;
  }

  async findByName(userId: number, name: string): Promise<FilmSupplier | null> {
    const normalizedName = normalizeReferenceValue(name);
    if (!normalizedName) {
      return null;
    }
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { user: userId, normalizedName }, { populate: ['user'] });
    return entity ? mapFilmSupplierEntity(entity) : null;
  }

  async create(userId: number, input: CreateFilmSupplierRequest): Promise<FilmSupplier> {
    const name = sanitizeReferenceValue(input.name);
    const entity = this.entityManager.create(FilmSupplierEntity, {
      user: this.entityManager.getReference(UserEntity, userId),
      name,
      normalizedName: normalizeReferenceValue(name),
      contact: sanitizeOptional(input.contact),
      email: sanitizeOptional(input.email),
      website: sanitizeOptional(input.website),
      notes: sanitizeOptional(input.notes),
      active: true,
      rating: input.rating ?? null
    });
    this.entityManager.persist(entity);
    await this.entityManager.flush();
    await this.entityManager.populate(entity, ['user']);
    return mapFilmSupplierEntity(entity);
  }

  async update(userId: number, supplierId: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier | null> {
    const entity = await this.entityManager.findOne(FilmSupplierEntity, { id: supplierId, user: userId }, { populate: ['user'] });
    if (!entity) {
      return null;
    }

    if (input.name !== undefined) {
      const name = sanitizeReferenceValue(input.name);
      entity.name = name;
      entity.normalizedName = normalizeReferenceValue(name);
    }
    if (input.contact !== undefined) entity.contact = sanitizeNullable(input.contact);
    if (input.email !== undefined) entity.email = sanitizeNullable(input.email);
    if (input.website !== undefined) entity.website = sanitizeNullable(input.website);
    if (input.notes !== undefined) entity.notes = sanitizeNullable(input.notes);
    if (input.active !== undefined) entity.active = input.active;
    if (input.rating !== undefined) entity.rating = input.rating;

    await this.entityManager.flush();
    return mapFilmSupplierEntity(entity);
  }
}

function sanitizeOptional(value: string | undefined): string | null {
  return sanitizeNullable(value ?? null);
}

function sanitizeNullable(value: string | null): string | null {
  const next = sanitizeReferenceValue(value ?? '');
  return next.length > 0 ? next : null;
}
