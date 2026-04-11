import { Inject, Injectable } from '@nestjs/common';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { IFilmStateRepository, FILM_STATE_REPOSITORY } from '../../../domain/film-state/repositories/film-state.repository.interface';

@Injectable()
export class FilmStateService {
  constructor(@Inject(FILM_STATE_REPOSITORY) private readonly filmStateRepo: IFilmStateRepository) {}

  findByfilmId(filmId: number): Promise<FilmState[]> {
    return this.filmStateRepo.findByfilmId(filmId);
  }
}
