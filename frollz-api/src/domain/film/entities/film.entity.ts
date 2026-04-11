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
    public readonly transitionprofileId: number,
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
    transitionprofileId: number;
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
      props.transitionprofileId,
      props.emulsion,
      props.tags ?? [],
      props.states ?? [],
      props.parent,
    );
  }

  get currentState(): FilmState | null {
    if (this.states.length === 0) return null;
    return this.states.reduce((latest, state) =>
      state.date > latest.date ? state : latest,
    );
  }
}
