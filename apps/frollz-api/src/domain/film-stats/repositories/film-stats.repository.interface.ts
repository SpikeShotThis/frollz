export interface StateCount {
  state: string;
  count: number;
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface EmulsionCount {
  emulsionName: string;
  count: number;
}

export interface TransitionDuration {
  transition: string;
  avgDays: number | null;
}

export const FILM_STATS_REPOSITORY = "FILM_STATS_REPOSITORY";

export interface IFilmStatsRepository {
  countByCurrentState(): Promise<StateCount[]>;
  countByFirstStateMonth(months: number): Promise<MonthCount[]>;
  countByEmulsion(): Promise<EmulsionCount[]>;
  avgTransitionDurations(): Promise<TransitionDuration[]>;
}
