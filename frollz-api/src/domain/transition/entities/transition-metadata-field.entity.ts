export class TransitionMetadataField {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly fieldType: string,
    public readonly allowMultiple: boolean,
  ) {}

  static create(props: { id: number; name: string; fieldType: string; allowMultiple?: boolean }): TransitionMetadataField {
    return new TransitionMetadataField(props.id, props.name, props.fieldType, props.allowMultiple ?? false);
  }
}
