import { Note } from "../entities/note.entity";

export const NOTE_REPOSITORY = Symbol("NOTE_REPOSITORY");

export interface INoteRepository {
  findById(id: number): Promise<Note | null>;
  findAll(): Promise<Note[]>;
  findByEntityId(entityId: number): Promise<Note[]>;
  save(format: Note): Promise<number>;
}
