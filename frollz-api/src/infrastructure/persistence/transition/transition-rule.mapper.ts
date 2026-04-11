import { TransitionRule } from '../../../domain/transition/entities/transition-rule.entity';
import { TransitionRuleRow } from '../types/db.types';

export class TransitionRuleMapper {
  static toDomain(row: TransitionRuleRow): TransitionRule {
    return TransitionRule.create({
      id: row.id.trim(),
      fromStateId: row.from_state_id.trim(),
      toStateId: row.to_state.trim(),
      profileId: row.profile_id.trim(),
    });
  }

  static toPersistence(rule: TransitionRule): TransitionRuleRow {
    return {
      id: rule.id,
      from_state_id: rule.fromStateId,
      to_state: rule.toStateId,
      profile_id: rule.profileId,
    };
  }
}
