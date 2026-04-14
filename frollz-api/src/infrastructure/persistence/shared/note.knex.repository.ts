import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Note, EntityType } from '../../../domain/shared/entities/note.entity';
import { INoteRepository } from '../../../domain/shared/repositories/note.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { NoteRow } from '../types/db.types';

@Injectable()
export class NoteKnexRepository implements INoteRepository {

  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Note | null> {
    const row = await this.knex<NoteRow>('note').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }
  async findAll(): Promise<Note[]> {
    const rows = await this.knex<NoteRow>('note').select('*').orderBy('created_at', 'desc');
    return rows.map((r) => this.toDomain(r));
  }
  async findByEntityId(entityId: number): Promise<Note[]> {
    const rows = await this.knex<NoteRow>('note').where({ entity_id: entityId }).orderBy('created_at', 'desc');
    return rows.map((r) => this.toDomain(r));
  }
  async save(note: Note): Promise<number> {
    const [generatedId] = await this.knex('note').insert({
          entity_id: note.entity_id,
          entity_type: note.entity_type,
          text: note.text,
          created_at: new Date(),
    });
    return generatedId;
  }

  private toDomain(row: NoteRow): Note {
    return Note.create({
      id: row.id,
      entity_id: row.entity_id,
      entity_type: row.entity_type as EntityType, // Type assertion since DB returns string
      text: row.text,
      created_at: row.created_at,
    });
  }
}