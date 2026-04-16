import { Inject, Injectable } from "@nestjs/common";
import {
  EmulsionCount,
  FILM_STATS_REPOSITORY,
  IFilmStatsRepository,
  MonthCount,
  StateCount,
  TransitionDuration,
} from "../../../domain/film-stats/repositories/film-stats.repository.interface";

@Injectable()
export class FilmStatsService {
  constructor(
    @Inject(FILM_STATS_REPOSITORY)
    private readonly statsRepo: IFilmStatsRepository,
  ) {}

  countByCurrentState(): Promise<StateCount[]> {
    return this.statsRepo.countByCurrentState();
  }

  countByFirstStateMonth(months: number): Promise<MonthCount[]> {
    return this.statsRepo.countByFirstStateMonth(months);
  }

  countByEmulsion(): Promise<EmulsionCount[]> {
    return this.statsRepo.countByEmulsion();
  }

  avgTransitionDurations(): Promise<TransitionDuration[]> {
    return this.statsRepo.avgTransitionDurations();
  }
}
