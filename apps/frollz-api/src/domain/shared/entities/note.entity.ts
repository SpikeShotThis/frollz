export type EntityType =
  | "film"
  | "emulsion"
  | "package"
  | "process"
  | "profile"
  | "film_state"
  | "camera";

export class Note {
  constructor(
    public readonly id: number,
    public readonly entity_id: number,
    public readonly entity_type: EntityType,
    public readonly text: string,
    public readonly created_at: Date,
  ) {}

  static create(props: {
    id?: number;
    entity_id: number;
    entity_type: EntityType;
    text: string;
    created_at: Date;
  }): Note {
    return new Note(
      props.id ?? 0,
      props.entity_id,
      props.entity_type,
      props.text,
      props.created_at,
    );
  }
}
