import { TransitionRule } from '../../../domain/transition/entities/transition-rule.entity';
import { TransitionRuleRow } from '../types/db.types';

export class TransitionRuleMapper {
  static toDomain(row: TransitionRuleRow): TransitionRule {
    return TransitionRule.create({
      id: row.id,
      fromStateId: row.from_state_id,
      toStateId: row.to_state_id,
      profileId: row.profile_id,
    });
  }

  static toPersistence(rule: TransitionRule): TransitionRuleRow {
    return {
      id: rule.id,
      from_state_id: rule.fromStateId,
      to_state_id: rule.toStateId,
      profile_id: rule.profileId,
    };
  }
}
