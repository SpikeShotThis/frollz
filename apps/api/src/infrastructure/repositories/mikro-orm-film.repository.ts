import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { DeviceLoadTimelineEvent, FilmListQuery } from '@frollz2/schema';
import { FilmRepository } from './film.repository.js';
import { FilmEntity, FilmFrameEntity, FilmJourneyEventEntity } from '../entities/index.js';
import { mapFilmDetailEntity, mapFilmFrameEntity, mapFilmJourneyEventEntity, mapFilmSummaryEntity, parseLoadedEventData, formatEmulsionName } from '../mappers/index.js';

function toStockLabel(film: FilmEntity): string | null {
  const formatCode = film.filmFormat.code;

  if (formatCode === '35mm') {
    const match = /^(\d+)exp$/i.exec(film.packageType.code);
    if (match) {
      return `${match[1]} exposures`;
    }
    return film.packageType.label;
  }

  if (formatCode === '120') {
    return film.packageType.label;
  }

  return null;
}

function isAfterEventOrder(
  leftOccurredAt: string,
  leftId: number,
  rightOccurredAt: string,
  rightId: number
): boolean {
  const leftTs = Date.parse(leftOccurredAt);
  const rightTs = Date.parse(rightOccurredAt);

  if (!Number.isNaN(leftTs) && !Number.isNaN(rightTs) && leftTs !== rightTs) {
    return leftTs > rightTs;
  }

  return leftId > rightId;
}

@Injectable()
export class MikroOrmFilmRepository extends FilmRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number, query: FilmListQuery) {
    const limit = query.limit;
    const films = await this.entityManager.find(
      FilmEntity,
      {
        user: userId,
        ...(query.afterId ? { id: { $gt: query.afterId } } : {}),
        ...(query.stateCode ? { currentState: { code: query.stateCode } } : {}),
        ...(query.filmFormatId ? { filmFormat: query.filmFormatId } : {}),
        ...(query.emulsionId ? { emulsion: query.emulsionId } : {})
      },
      {
        orderBy: { id: 'asc' },
        limit: limit + 1,
        populate: ['user', 'filmLot', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState']
      }
    );

    const hasMore = films.length > limit;
    const items = hasMore ? films.slice(0, limit) : films;
    return {
      items: items.map(mapFilmSummaryEntity),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null
    };
  }

  async findById(userId: number, filmId: number) {
    const film = await this.entityManager.findOne(
      FilmEntity,
      { id: filmId, user: userId },
      { populate: ['user', 'filmLot', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
    );

    if (!film) {
      return null;
    }

    const latestEvent = await this.entityManager.findOne(
      FilmJourneyEventEntity,
      { film: film.id, user: userId },
      { orderBy: { occurredAt: 'desc', id: 'desc' }, populate: ['film', 'user', 'filmState'] }
    );

    return mapFilmDetailEntity(film, latestEvent ?? null);
  }

  async findByIdSummary(userId: number, filmId: number) {
    const film = await this.entityManager.findOne(
      FilmEntity,
      { id: filmId, user: userId },
      { populate: ['user', 'filmLot', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
    );

    return film ? mapFilmSummaryEntity(film) : null;
  }

  async update(userId: number, filmId: number, input: { name?: string; expirationDate?: string | null }) {
    const film = await this.entityManager.findOne(FilmEntity, { id: filmId, user: userId });

    if (!film) {
      return null;
    }

    if (input.name !== undefined) {
      film.name = input.name;
    }

    if (input.expirationDate !== undefined) {
      film.expirationDate = input.expirationDate;
    }

    this.entityManager.persist(film);
    await this.entityManager.flush();

    const persisted = await this.entityManager.findOneOrFail(
      FilmEntity,
      { id: filmId, user: userId },
      { populate: ['user', 'filmLot', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
    );

    return mapFilmSummaryEntity(persisted);
  }

  async listEvents(userId: number, filmId: number) {
    const events = await this.entityManager.find(
      FilmJourneyEventEntity,
      { film: filmId, user: userId },
      { orderBy: { occurredAt: 'asc', id: 'asc' }, populate: ['film', 'user', 'filmState'] }
    );

    return events.map(mapFilmJourneyEventEntity);
  }

  async listFrames(userId: number, filmId: number) {
    const frames = await this.entityManager.find(
      FilmFrameEntity,
      { user: userId, film: filmId },
      {
        orderBy: { frameNumber: 'asc', id: 'asc' },
        populate: ['user', 'film', 'currentState']
      }
    );

    return frames.map(mapFilmFrameEntity);
  }

  async listDeviceLoadEvents(userId: number, deviceId: number): Promise<DeviceLoadTimelineEvent[]> {
    const loadedEvents = await this.entityManager.find(
      FilmJourneyEventEntity,
      { user: userId, filmState: { code: 'loaded' } },
      {
        orderBy: { occurredAt: 'desc', id: 'desc' },
        populate: [
          'film',
          'film.user',
          'film.emulsion',
          'film.emulsion.developmentProcess',
          'film.packageType',
          'film.filmFormat',
          'filmState',
          'user'
        ]
      }
    );

    const filteredLoadedEvents: Array<{ event: FilmJourneyEventEntity; slotSideNumber: number | null }> = [];
    for (const event of loadedEvents) {
      const eventData = parseLoadedEventData(event.eventData);
      if (!eventData) {
        continue;
      }
      if (eventData.deviceId !== deviceId) {
        continue;
      }

      filteredLoadedEvents.push({
        event,
        slotSideNumber: eventData.slotSideNumber
      });
    }

    if (filteredLoadedEvents.length === 0) {
      return [];
    }

    const filmIds = [...new Set(filteredLoadedEvents.map(({ event }) => event.film.id))];
    const trackedFilmIds = new Set(filmIds);
    const removedEvents = await this.entityManager.find(
      FilmJourneyEventEntity,
      { user: userId, filmState: { code: 'removed' } },
      {
        orderBy: { film: { id: 'asc' }, occurredAt: 'asc', id: 'asc' },
        populate: ['film', 'filmState', 'user']
      }
    );

    const removedEventsByFilmId = new Map<number, FilmJourneyEventEntity[]>();
    for (const removedEvent of removedEvents) {
      if (!trackedFilmIds.has(removedEvent.film.id)) {
        continue;
      }
      const list = removedEventsByFilmId.get(removedEvent.film.id) ?? [];
      list.push(removedEvent);
      removedEventsByFilmId.set(removedEvent.film.id, list);
    }

    const removedAtByLoadedEventId = new Map<number, string>();
    for (const { event: loadedEvent } of filteredLoadedEvents) {
      const candidates = removedEventsByFilmId.get(loadedEvent.film.id);
      if (!candidates || candidates.length === 0) {
        continue;
      }

      const index = candidates.findIndex((candidate) =>
        isAfterEventOrder(candidate.occurredAt, candidate.id, loadedEvent.occurredAt, loadedEvent.id)
      );
      if (index === -1) {
        continue;
      }

      const [matchedRemoved] = candidates.splice(index, 1);
      if (matchedRemoved) {
        removedAtByLoadedEventId.set(loadedEvent.id, matchedRemoved.occurredAt);
      }
    }

    const loadEvents: DeviceLoadTimelineEvent[] = [];
    for (const { event, slotSideNumber } of filteredLoadedEvents) {
      const emulsion = event.film.emulsion;
      loadEvents.push({
        eventId: event.id,
        filmId: event.film.id,
        filmName: event.film.name,
        emulsionName: formatEmulsionName(emulsion),
        stockLabel: toStockLabel(event.film),
        developmentProcessCode: emulsion.developmentProcess.code,
        occurredAt: event.occurredAt,
        removedAt: removedAtByLoadedEventId.get(event.id) ?? null,
        slotSideNumber
      });
    }

    return loadEvents;
  }

  async findOccupiedFilmForDeviceId(userId: number, deviceId: number): Promise<number | null> {
    const film = await this.entityManager.findOne(FilmEntity, {
      user: userId,
      currentDevice: deviceId,
      currentState: { code: { $in: ['loaded', 'exposed'] } }
    });
    return film ? film.id : null;
  }

}
