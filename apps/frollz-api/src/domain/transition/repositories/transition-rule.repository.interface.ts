import { TransitionRule } from "../entities/transition-rule.entity";

export const TRANSITION_RULE_REPOSITORY = "TRANSITION_RULE_REPOSITORY";

export interface ITransitionRuleRepository {
  findById(id: number): Promise<TransitionRule | null>;
  findAll(): Promise<TransitionRule[]>;
  findByProfileId(profileId: number): Promise<TransitionRule[]>;
  findByFromStateId(fromStateId: number): Promise<TransitionRule[]>;
  findByFromStateAndProfile(
    fromStateId: number,
    profileId: number,
  ): Promise<TransitionRule[]>;
  save(rule: TransitionRule): Promise<void>;
  update(rule: TransitionRule): Promise<void>;
  delete(id: number): Promise<void>;
}
