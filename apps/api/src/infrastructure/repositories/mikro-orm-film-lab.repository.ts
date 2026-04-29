import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { CreateFilmLabRequest, FilmLab, ListFilmLabsQuery, UpdateFilmLabRequest } from '@frollz2/schema';
import { FilmLabRepository } from './film-lab.repository.js';
import { FilmLabEntity, UserEntity } from '../entities/index.js';
import { mapFilmLabEntity } from '../mappers/index.js';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../../domain/reference/reference-value.utils.js';

@Injectable()
export class MikroOrmFilmLabRepository extends FilmLabRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number, query: ListFilmLabsQuery): Promise<FilmLab[]> {
    const normalizedQuery = normalizeReferenceValue(query.q);
    const entities = await this.entityManager.find(
      FilmLabEntity,
      {
        user: userId,
        ...(query.includeInactive ? {} : { active: true }),
        ...(normalizedQuery.length > 0 ? { normalizedName: { $like: `${normalizedQuery}%` } } : {})
      },
      { orderBy: [{ active: 'desc' }, { name: 'asc' }], limit: query.limit, populate: ['user'] }
    );

    return entities.map(mapFilmLabEntity);
  }

  async findById(userId: number, filmLabId: number): Promise<FilmLab | null> {
    const entity = await this.entityManager.findOne(FilmLabEntity, { id: filmLabId, user: userId }, { populate: ['user'] });
    return entity ? mapFilmLabEntity(entity) : null;
  }

  async findByName(userId: number, name: string): Promise<FilmLab | null> {
    const normalizedName = normalizeReferenceValue(name);
    if (!normalizedName) {
      return null;
    }
    const entity = await this.entityManager.findOne(FilmLabEntity, { user: userId, normalizedName }, { populate: ['user'] });
    return entity ? mapFilmLabEntity(entity) : null;
  }

  async create(userId: number, input: CreateFilmLabRequest): Promise<FilmLab> {
    const name = sanitizeReferenceValue(input.name);
    const entity = this.entityManager.create(FilmLabEntity, {
      user: this.entityManager.getReference(UserEntity, userId),
      name,
      normalizedName: normalizeReferenceValue(name),
      contact: sanitizeOptional(input.contact),
      email: sanitizeOptional(input.email),
      website: sanitizeOptional(input.website),
      defaultProcesses: sanitizeOptional(input.defaultProcesses),
      notes: sanitizeOptional(input.notes),
      active: true,
      rating: input.rating ?? null
    });
    this.entityManager.persist(entity);
    await this.entityManager.flush();
    await this.entityManager.populate(entity, ['user']);
    return mapFilmLabEntity(entity);
  }

  async update(userId: number, filmLabId: number, input: UpdateFilmLabRequest): Promise<FilmLab | null> {
    const entity = await this.entityManager.findOne(FilmLabEntity, { id: filmLabId, user: userId }, { populate: ['user'] });
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
    if (input.defaultProcesses !== undefined) entity.defaultProcesses = sanitizeNullable(input.defaultProcesses);
    if (input.notes !== undefined) entity.notes = sanitizeNullable(input.notes);
    if (input.active !== undefined) entity.active = input.active;
    if (input.rating !== undefined) entity.rating = input.rating;

    await this.entityManager.flush();
    return mapFilmLabEntity(entity);
  }
}

function sanitizeOptional(value: string | undefined): string | null {
  return sanitizeNullable(value ?? null);
}

function sanitizeNullable(value: string | null): string | null {
  const next = sanitizeReferenceValue(value ?? '');
  return next.length > 0 ? next : null;
}
