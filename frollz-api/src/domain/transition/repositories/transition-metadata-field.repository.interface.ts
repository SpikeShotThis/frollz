import { TransitionMetadataField } from '../entities/transition-metadata-field.entity';

export const TRANSITION_METADATA_FIELD_REPOSITORY = 'TRANSITION_METADATA_FIELD_REPOSITORY';

export interface ITransitionMetadataFieldRepository {
  findById(id: number): Promise<TransitionMetadataField | null>;
  findAll(): Promise<TransitionMetadataField[]>;
  findByName(name: string): Promise<TransitionMetadataField | null>;
  save(field: TransitionMetadataField): Promise<void>;
  update(field: TransitionMetadataField): Promise<void>;
  delete(id: number): Promise<void>;
}
