import { TransitionState } from "../../../domain/transition/entities/transition-state.entity";
import { TransitionStateMetadata } from "../../../domain/transition/entities/transition-state-metadata.entity";
import { TransitionStateRow } from "../types/db.types";

export class TransitionStateMapper {
  static toDomain(
    row: TransitionStateRow,
    metadata: TransitionStateMetadata[] = [],
  ): TransitionState {
    return TransitionState.create({ id: row.id, name: row.name, metadata });
  }
}
