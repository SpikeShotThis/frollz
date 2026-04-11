export class TransitionMetadataField {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly fieldType: string,
  ) {}

  static create(props: { id: string; name: string; fieldType: string }): TransitionMetadataField {
    return new TransitionMetadataField(props.id, props.name, props.fieldType);
  }
}
