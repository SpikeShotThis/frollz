import { TransitionStateMetadata } from "../../../domain/transition/entities/transition-state-metadata.entity";
import { TransitionStateMetadataRow } from "../types/db.types";

export class TransitionStateMetadataMapper {
  static toDomain(row: TransitionStateMetadataRow): TransitionStateMetadata {
    return TransitionStateMetadata.create({
      id: row.id,
      fieldId: row.field_id,
      transitionStateId: row.transition_state_id,
      defaultValue: row.default_value,
    });
  }
}
