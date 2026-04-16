import { TransitionProfile } from "../../../domain/transition/entities/transition-profile.entity";
import { TransitionProfileRow } from "../types/db.types";

export class TransitionProfileMapper {
  static toDomain(row: TransitionProfileRow): TransitionProfile {
    return TransitionProfile.create({ id: row.id, name: row.name });
  }
}
