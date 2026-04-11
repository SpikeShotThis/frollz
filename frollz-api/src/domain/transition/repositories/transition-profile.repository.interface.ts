import { TransitionProfile } from '../entities/transition-profile.entity';

export const TRANSITION_PROFILE_REPOSITORY = 'TRANSITION_PROFILE_REPOSITORY';

export interface ITransitionProfileRepository {
  findById(id: string): Promise<TransitionProfile | null>;
  findAll(): Promise<TransitionProfile[]>;
  findByName(name: string): Promise<TransitionProfile | null>;
  save(profile: TransitionProfile): Promise<void>;
  update(profile: TransitionProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
