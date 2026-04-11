import { TransitionMetadataField } from './transition-metadata-field.entity';

export class TransitionStateMetadata {
  constructor(
    public readonly id: number,
    public readonly fieldId: number,
    public readonly transitionStateId: number,
    public readonly defaultValue: string | null,
    public readonly field?: TransitionMetadataField,
  ) {}

  static create(props: {
    id: number;
    fieldId: number;
    transitionStateId: number;
    defaultValue?: string | null;
    field?: TransitionMetadataField;
  }): TransitionStateMetadata {
    return new TransitionStateMetadata(
      props.id,
      props.fieldId,
      props.transitionStateId,
      props.defaultValue ?? null,
      props.field,
    );
  }
}
