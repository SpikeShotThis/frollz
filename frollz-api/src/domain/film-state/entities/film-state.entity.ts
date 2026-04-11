import { TransitionState } from '../../transition/entities/transition-state.entity';
import { FilmStateMetadata } from './film-state-metadata.entity';

export class FilmState {
  constructor(
    public readonly id: number,
    public readonly filmId: number,
    public readonly stateId: number,
    public readonly date: Date,
    public readonly note: string | null,
    public readonly state?: TransitionState,
    public readonly metadata: FilmStateMetadata[] = [],
  ) {}

  static create(props: {
    id?: number;
    filmId: number;
    stateId: number;
    date: Date;
    note?: string | null;
    state?: TransitionState;
    metadata?: FilmStateMetadata[];
  }): FilmState {
    return new FilmState(
      props.id ?? 0,
      props.filmId,
      props.stateId,
      props.date,
      props.note ?? null,
      props.state,
      props.metadata ?? [],
    );
  }
}
