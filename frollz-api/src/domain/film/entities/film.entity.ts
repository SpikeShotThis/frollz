import { Emulsion } from '../../emulsion/entities/emulsion.entity';
import { FilmState } from '../../film-state/entities/film-state.entity';
import { Tag } from '../../shared/entities/tag.entity';

export class Film {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly emulsionId: number,
    public readonly expirationDate: Date,
    public readonly parentId: number | null,
    public readonly transitionProfileId: number,
    public readonly emulsion?: Emulsion,
    public readonly tags: Tag[] = [],
    public readonly states: FilmState[] = [],
    public readonly parent?: Film,
  ) {}

  static create(props: {
    id?: number;
    name: string;
    emulsionId: number;
    expirationDate: Date;
    parentId?: number | null;
    transitionProfileId: number;
    emulsion?: Emulsion;
    tags?: Tag[];
    states?: FilmState[];
    parent?: Film;
  }): Film {
    return new Film(
      props.id ?? 0,
      props.name,
      props.emulsionId,
      props.expirationDate,
      props.parentId ?? null,
      props.transitionProfileId,
      props.emulsion,
      props.tags ?? [],
      props.states ?? [],
      props.parent,
    );
  }

  get currentState(): FilmState | null {
    if (this.states.length === 0) return null;
    return this.states.reduce((latest, state) =>
      new Date(state.date).getTime() > new Date(latest.date).getTime() ? state : latest,
    );
  }
}
