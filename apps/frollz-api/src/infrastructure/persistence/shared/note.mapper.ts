import { Note, EntityType } from "../../../domain/shared/entities/note.entity";
import { NoteRow } from "../types/db.types";

export class NoteMapper {
  static toDomain(row: NoteRow): Note {
    return Note.create({
      id: row.id,
      entity_id: row.entity_id,
      entity_type: row.entity_type as EntityType,
      text: row.text,
      created_at: row.created_at,
    });
  }
}
