export class TransitionMetadataField {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly fieldType: string,
  ) {}

  static create(props: { id: number; name: string; fieldType: string }): TransitionMetadataField {
    return new TransitionMetadataField(props.id, props.name, props.fieldType);
  }
}
