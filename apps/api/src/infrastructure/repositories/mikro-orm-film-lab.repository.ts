import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { CreateFilmLabRequest, FilmLab, FilmLabActivity, FilmLabFormatStats, ListFilmLabsQuery, UpdateFilmLabRequest } from '@frollz2/schema';
import { FilmLabRepository } from './film-lab.repository.js';
import { FilmJourneyEventEntity, FilmLabEntity, UserEntity } from '../entities/index.js';
import { mapDevelopmentProcessEntity, mapEmulsionEntity, mapFilmFormatEntity, mapFilmLabEntity, mapPackageTypeEntity } from '../mappers/index.js';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../../domain/reference/reference-value.utils.js';
import { average, daysBetween, daysSince, median } from '../../common/utils/stats.js';

const LAB_ACTIVITY_EVENT_POPULATE = [
  'film',
  'film.filmLot',
  'film.filmLot.supplier',
  'film.emulsion',
  'film.emulsion.developmentProcess',
  'film.emulsion.filmFormats',
  'film.packageType',
  'film.packageType.filmFormat',
  'film.filmFormat',
  'film.currentState',
  'filmState'
] as const;

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

  async activity(userId: number, filmLabId: number): Promise<FilmLabActivity | null> {
    const lab = await this.entityManager.findOne(FilmLabEntity, { id: filmLabId, user: userId }, { populate: ['user'] });
    if (!lab) {
      return null;
    }

    const events = await this.entityManager.find(
      FilmJourneyEventEntity,
      {
        user: userId,
        filmState: { code: { $in: ['sent_for_dev', 'developed'] } }
      },
      {
        orderBy: { occurredAt: 'asc', id: 'asc' },
        populate: LAB_ACTIVITY_EVENT_POPULATE
      }
    );
    const now = new Date();
    const latestSentByFilmId = new Map<number, FilmJourneyEventEntity>();
    const developedEventsByFilmId = new Map<number, FilmJourneyEventEntity[]>();
    const statsByFormat = new Map<number, {
      filmFormat: FilmJourneyEventEntity['film']['filmFormat'];
      activeQueueCount: number;
      turnarounds: number[];
      costsByCurrency: Map<string, number[]>;
    }>();

    for (const event of events) {
      if (event.filmState.code === 'sent_for_dev') {
        const current = latestSentByFilmId.get(event.film.id);
        if (!current || compareEventOrder(event, current) > 0) {
          latestSentByFilmId.set(event.film.id, event);
        }
      }

      if (event.filmState.code === 'developed') {
        const list = developedEventsByFilmId.get(event.film.id) ?? [];
        list.push(event);
        developedEventsByFilmId.set(event.film.id, list);
      }
    }

    const activeSentEventIds = new Set<number>();
    for (const event of latestSentByFilmId.values()) {
      if (labIdFrom(event.eventData) !== filmLabId || event.film.currentState.code !== 'sent_for_dev') {
        continue;
      }
      activeSentEventIds.add(event.id);
      const row = getFormatStatsRow(statsByFormat, event);
      row.activeQueueCount += 1;
    }

    const activeFilms = [...latestSentByFilmId.values()]
      .filter((event) => activeSentEventIds.has(event.id))
      .sort((a, b) => compareEventOrder(a, b))
      .map((event) => ({
        filmId: event.film.id,
        filmName: event.film.name,
        sentAt: event.occurredAt,
        daysWaiting: daysSince(event.occurredAt, now),
        cost: developmentCostFrom(event.eventData),
        emulsion: mapEmulsionEntity(event.film.emulsion),
        packageType: mapPackageTypeEntity(event.film.packageType),
        filmFormat: mapFilmFormatEntity(event.film.filmFormat),
        developmentProcess: mapDevelopmentProcessEntity(event.film.emulsion.developmentProcess)
      }));

    for (const sentEvent of events) {
      if (sentEvent.filmState.code !== 'sent_for_dev' || labIdFrom(sentEvent.eventData) !== filmLabId) {
        continue;
      }

      const row = getFormatStatsRow(statsByFormat, sentEvent);
      const cost = developmentCostFrom(sentEvent.eventData);
      if (cost) {
        const values = row.costsByCurrency.get(cost.currencyCode) ?? [];
        values.push(cost.amount);
        row.costsByCurrency.set(cost.currencyCode, values);
      }

      const developed = (developedEventsByFilmId.get(sentEvent.film.id) ?? []).find((candidate) => {
        return labIdFrom(candidate.eventData) === filmLabId && compareEventOrder(candidate, sentEvent) >= 0;
      });
      if (developed) {
        const turnaround = daysBetween(sentEvent.occurredAt, developed.occurredAt);
        if (turnaround !== null) {
          row.turnarounds.push(turnaround);
        }
      }
    }

    return {
      lab: mapFilmLabEntity(lab),
      activeFilms,
      formatStats: [...statsByFormat.values()]
        .map((row): FilmLabFormatStats => ({
          filmFormat: mapFilmFormatEntity(row.filmFormat),
          activeQueueCount: row.activeQueueCount,
          completedCount: row.turnarounds.length,
          averageTurnaroundDays: average(row.turnarounds),
          typicalCostByCurrency: [...row.costsByCurrency.entries()].map(([currencyCode, values]) => ({
            currencyCode,
            averageAmount: average(values) ?? 0,
            medianAmount: median(values) ?? 0
          }))
        }))
        .sort((a, b) => b.activeQueueCount - a.activeQueueCount || b.completedCount - a.completedCount || a.filmFormat.label.localeCompare(b.filmFormat.label))
    };
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

function getFormatStatsRow(
  rows: Map<number, {
    filmFormat: FilmJourneyEventEntity['film']['filmFormat'];
    activeQueueCount: number;
    turnarounds: number[];
    costsByCurrency: Map<string, number[]>;
  }>,
  event: FilmJourneyEventEntity
) {
  const key = event.film.filmFormat.id;
  const existing = rows.get(key);
  if (existing) return existing;
  const row = {
    filmFormat: event.film.filmFormat,
    activeQueueCount: 0,
    turnarounds: [],
    costsByCurrency: new Map<string, number[]>()
  };
  rows.set(key, row);
  return row;
}

function labIdFrom(eventData: Record<string, unknown>): number | null {
  const value = eventData['labId'];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function developmentCostFrom(eventData: Record<string, unknown>): { amount: number; currencyCode: string } | null {
  const cost = eventData['cost'];
  if (!cost || typeof cost !== 'object') return null;
  const raw = cost as Record<string, unknown>;
  return typeof raw['amount'] === 'number' && typeof raw['currencyCode'] === 'string'
    ? { amount: raw['amount'], currencyCode: raw['currencyCode'] }
    : null;
}

function compareEventOrder(left: FilmJourneyEventEntity, right: FilmJourneyEventEntity): number {
  const leftTs = Date.parse(left.occurredAt);
  const rightTs = Date.parse(right.occurredAt);
  if (!Number.isNaN(leftTs) && !Number.isNaN(rightTs) && leftTs !== rightTs) {
    return leftTs - rightTs;
  }
  return left.id - right.id;
}

