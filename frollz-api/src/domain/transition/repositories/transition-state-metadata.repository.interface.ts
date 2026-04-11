import { TransitionStateMetadata } from '../entities/transition-state-metadata.entity';

export const TRANSITION_STATE_METADATA_REPOSITORY = 'TRANSITION_STATE_METADATA_REPOSITORY';

export interface ITransitionStateMetadataRepository {
  findById(id: string): Promise<TransitionStateMetadata | null>;
  findAll(): Promise<TransitionStateMetadata[]>;
  findByTransitionStateId(transitionStateId: string): Promise<TransitionStateMetadata[]>;
  save(metadata: TransitionStateMetadata): Promise<void>;
  update(metadata: TransitionStateMetadata): Promise<void>;
  delete(id: string): Promise<void>;
}
