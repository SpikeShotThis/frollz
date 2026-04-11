import { TransitionRule } from '../entities/transition-rule.entity';

export const TRANSITION_RULE_REPOSITORY = 'TRANSITION_RULE_REPOSITORY';

export interface ITransitionRuleRepository {
  findById(id: string): Promise<TransitionRule | null>;
  findAll(): Promise<TransitionRule[]>;
  findByProfileId(profileId: string): Promise<TransitionRule[]>;
  findByFromStateId(fromStateId: string): Promise<TransitionRule[]>;
  save(rule: TransitionRule): Promise<void>;
  update(rule: TransitionRule): Promise<void>;
  delete(id: string): Promise<void>;
}
