import { Inject, Injectable } from '@nestjs/common';
import { Film } from '../../../domain/film/entities/film.entity';
import { IFilmRepository, FILM_REPOSITORY } from '../../../domain/film/repositories/film.repository.interface';

export interface FilmsExportEnvelope {
  version: string;
  exportedAt: string;
  films: Film[];
}

@Injectable()
export class ExportService {
  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
  ) {}

  async exportFilmsJson(): Promise<FilmsExportEnvelope> {
    const films = await this.filmRepo.findAll();
    return {
      version: process.env.APP_VERSION ?? 'unknown',
      exportedAt: new Date().toISOString(),
      films,
    };
  }
}
