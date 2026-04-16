import { Tag } from "../../../domain/shared/entities/tag.entity";
import { TagRow } from "../types/db.types";

export class TagMapper {
  static toDomain(row: TagRow): Tag {
    return Tag.create({
      id: row.id,
      name: row.name,
      colorCode: row.color_code,
      description: row.description,
    });
  }
}
