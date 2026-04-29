import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { FilmLotDetail, FilmLotSummary } from '@frollz2/schema';
import { FilmLotRepository } from './film-lot.repository.js';
import { FilmEntity, FilmLotEntity } from '../entities/index.js';
import { mapFilmLotDetailEntity, mapFilmLotSummaryEntity } from '../mappers/index.js';

@Injectable()
export class MikroOrmFilmLotRepository extends FilmLotRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async list(userId: number): Promise<FilmLotSummary[]> {
    const lots = await this.entityManager.find(
      FilmLotEntity,
      { user: userId },
      { populate: ['user', 'supplier', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat'] }
    );

    const filmCounts = await Promise.all(
      lots.map((lot) => this.entityManager.count(FilmEntity, { filmLot: lot.id, user: userId }))
    );

    return lots.map((lot, i) => mapFilmLotSummaryEntity(lot, filmCounts[i] ?? 0));
  }

  async findById(userId: number, lotId: number): Promise<FilmLotDetail | null> {
    const lot = await this.entityManager.findOne(
      FilmLotEntity,
      { id: lotId, user: userId },
      { populate: ['user', 'supplier', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat'] }
    );

    if (!lot) {
      return null;
    }

    const films = await this.entityManager.find(
      FilmEntity,
      { filmLot: lotId, user: userId },
      { populate: ['user', 'emulsion', 'emulsion.developmentProcess', 'emulsion.filmFormats', 'packageType', 'packageType.filmFormat', 'filmFormat', 'currentState'], orderBy: { id: 'asc' } }
    );

    return mapFilmLotDetailEntity(lot, films);
  }
}
