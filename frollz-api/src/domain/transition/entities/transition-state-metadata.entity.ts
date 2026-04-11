import { TransitionMetadataField } from './transition-metadata-field.entity';

export class TransitionStateMetadata {
  constructor(
    public readonly id: string,
    public readonly fieldId: string,
    public readonly transitionStateId: string,
    public readonly defaultValue: string | null,
    public readonly field?: TransitionMetadataField,
  ) {}

  static create(props: {
    id: string;
    fieldId: string;
    transitionStateId: string;
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
