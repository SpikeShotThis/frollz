import { TransitionState } from '../../transition/entities/transition-state.entity';
import { FilmStateMetadata } from './film-state-metadata.entity';

export class FilmState {
  constructor(
    public readonly id: string,
    public readonly filmId: string,
    public readonly stateId: string,
    public readonly date: Date,
    public readonly note: string | null,
    public readonly state?: TransitionState,
    public readonly metadata: FilmStateMetadata[] = [],
  ) {}

  static create(props: {
    id: string;
    filmId: string;
    stateId: string;
    date: Date;
    note?: string | null;
    state?: TransitionState;
    metadata?: FilmStateMetadata[];
  }): FilmState {
    return new FilmState(
      props.id,
      props.filmId,
      props.stateId,
      props.date,
      props.note ?? null,
      props.state,
      props.metadata ?? [],
    );
  }
}
