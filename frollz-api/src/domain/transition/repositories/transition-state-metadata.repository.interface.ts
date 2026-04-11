import { TransitionStateMetadata } from '../entities/transition-state-metadata.entity';

export const TRANSITION_STATE_METADATA_REPOSITORY = 'TRANSITION_STATE_METADATA_REPOSITORY';

export interface ITransitionStateMetadataRepository {
  findById(id: number): Promise<TransitionStateMetadata | null>;
  findAll(): Promise<TransitionStateMetadata[]>;
  findByTransitionStateId(transitionStateId: number): Promise<TransitionStateMetadata[]>;
  save(metadata: TransitionStateMetadata): Promise<void>;
  update(metadata: TransitionStateMetadata): Promise<void>;
  delete(id: number): Promise<void>;
}
