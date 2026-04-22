import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { filmJourneyEventDataLoadedSchema } from '@frollz2/schema';
import { FilmRepository } from './film.repository.js';
import { FilmEntity, FilmJourneyEventEntity } from '../entities/index.js';
import { mapFilmDetailEntity, mapFilmJourneyEventEntity, mapFilmSummaryEntity } from '../mappers/index.js';

@Injectable()
export class MikroOrmFilmRepository extends FilmRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number, query: { stateCode?: 'purchased' | 'stored' | 'loaded' | 'exposed' | 'removed' | 'sent_for_dev' | 'developed' | 'scanned' | 'archived'; filmFormatId?: number; emulsionId?: number }) {
    const films = await this.entityManager.find(
      FilmEntity,
      {
        user: userId,
        ...(query.stateCode ? { currentState: { code: query.stateCode } } : {}),
        ...(query.filmFormatId ? { filmFormat: query.filmFormatId } : {}),
        ...(query.emulsionId ? { emulsion: query.emulsionId } : {})
      },
      { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
    );

    return films.map(mapFilmSummaryEntity);
  }

  async findById(userId: number, filmId: number) {
    const film = await this.entityManager.findOne(
      FilmEntity,
      { id: filmId, user: userId },
      { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
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
      { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
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
      { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'] }
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

  async findOccupiedFilmForReceiverId(userId: number, receiverId: number): Promise<number | null> {
    const loadedEvents = await this.entityManager.find(
      FilmJourneyEventEntity,
      { user: userId, filmState: { code: 'loaded' } },
      { populate: ['film', 'film.currentState', 'film.user', 'filmState'], orderBy: { film: { id: 'asc' }, occurredAt: 'desc', id: 'desc' } }
    );

    const seenFilmIds = new Set<number>();

    for (const loadedEvent of loadedEvents) {
      const filmId = loadedEvent.film.id;

      if (seenFilmIds.has(filmId)) {
        continue;
      }

      seenFilmIds.add(filmId);

      if (loadedEvent.film.currentState.code !== 'loaded' && loadedEvent.film.currentState.code !== 'exposed') {
        continue;
      }

      const loadedEventData = filmJourneyEventDataLoadedSchema.parse(loadedEvent.eventData);

      if (loadedEventData.receiverId === receiverId) {
        return filmId;
      }
    }

    return null;
  }

}
