import { Injectable } from "@nestjs/common";
import { Note } from "../../../domain/shared/entities/note.entity";
import { INoteRepository } from "../../../domain/shared/repositories/note.repository.interface";
import { NoteRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { NoteMapper } from "./note.mapper";

@Injectable()
export class NoteKnexRepository
  extends BaseKnexRepository
  implements INoteRepository
{
  async findById(id: number): Promise<Note | null> {
    const row = await this.db<NoteRow>("note").where({ id }).first();
    return row ? NoteMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Note[]> {
    const rows = await this.db<NoteRow>("note")
      .select("*")
      .orderBy("created_at", "desc");
    return rows.map((r) => NoteMapper.toDomain(r));
  }

  async findByEntityId(entityId: number): Promise<Note[]> {
    const rows = await this.db<NoteRow>("note")
      .where({ entity_id: entityId })
      .orderBy("created_at", "desc");
    return rows.map((r) => NoteMapper.toDomain(r));
  }

  async save(note: Note): Promise<number> {
    const [generatedId] = await this.db("note").insert({
      entity_id: note.entity_id,
      entity_type: note.entity_type,
      text: note.text,
      created_at: new Date(),
    });
    return generatedId;
  }
}
