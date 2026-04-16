import { TransitionStateMetadata } from "../../transition/entities/transition-state-metadata.entity";

export class FilmStateMetadata {
  constructor(
    public readonly id: number,
    public readonly filmStateId: number,
    public readonly transitionStateMetadataId: number,
    public readonly value: string | string[] | null,
    public readonly transitionStateMetadata?: TransitionStateMetadata,
  ) {}

  static create(props: {
    id: number;
    filmStateId: number;
    transitionStateMetadataId: number;
    value?: string | string[] | null;
    transitionStateMetadata?: TransitionStateMetadata;
  }): FilmStateMetadata {
    return new FilmStateMetadata(
      props.id,
      props.filmStateId,
      props.transitionStateMetadataId,
      props.value ?? null,
      props.transitionStateMetadata,
    );
  }
}
