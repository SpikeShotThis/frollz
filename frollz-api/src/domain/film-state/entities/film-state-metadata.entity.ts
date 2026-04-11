import { TransitionStateMetadata } from '../../transition/entities/transition-state-metadata.entity';

export class FilmStateMetadata {
  constructor(
    public readonly id: number,
    public readonly filmStateid: number,
    public readonly transitionStateMetadataid: number,
    public readonly transitionStateMetadata?: TransitionStateMetadata,
  ) {}

  static create(props: {
    id: number;
    filmStateid: number;
    transitionStateMetadataid: number;
    transitionStateMetadata?: TransitionStateMetadata;
  }): FilmStateMetadata {
    return new FilmStateMetadata(
      props.id,
      props.filmStateId,
      props.transitionStateMetadataId,
      props.transitionStateMetadata,
    );
  }
}
