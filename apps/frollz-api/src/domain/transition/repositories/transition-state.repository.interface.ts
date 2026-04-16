import { TransitionState } from "../entities/transition-state.entity";

export const TRANSITION_STATE_REPOSITORY = "TRANSITION_STATE_REPOSITORY";

export interface ITransitionStateRepository {
  findById(id: number): Promise<TransitionState | null>;
  findAll(): Promise<TransitionState[]>;
  findByName(name: string): Promise<TransitionState | null>;
  save(state: TransitionState): Promise<void>;
  update(state: TransitionState): Promise<void>;
  delete(id: number): Promise<void>;
}
