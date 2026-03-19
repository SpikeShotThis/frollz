import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateRollTagDto } from "./dto/create-roll-tag.dto";
import { RollTag } from "./entities/roll-tag.entity";

function mapRollTag(row: Record<string, unknown>): RollTag {
  return {
    _key: row.id as string,
    rollKey: row.roll_key as string,
    tagKey: row.tag_key as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
  };
}

@Injectable()
export class RollTagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createRollTagDto: CreateRollTagDto): Promise<RollTag> {
    const id = randomUUID();
    const now = new Date();

    await this.databaseService.execute(
      `INSERT INTO roll_tags (id, roll_key, tag_key, created_at) VALUES (?, ?, ?, ?)`,
      [id, createRollTagDto.rollKey, createRollTagDto.tagKey, now],
    );

    return {
      _key: id,
      rollKey: createRollTagDto.rollKey,
      tagKey: createRollTagDto.tagKey,
      createdAt: now,
    };
  }

  async findAll(): Promise<RollTag[]> {
    const rows = await this.databaseService.query(`SELECT * FROM roll_tags`);
    return rows.map(mapRollTag);
  }

  async findByRoll(rollKey: string): Promise<RollTag[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM roll_tags WHERE roll_key = ?`,
      [rollKey],
    );
    return rows.map(mapRollTag);
  }

  async findByTag(tagKey: string): Promise<RollTag[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM roll_tags WHERE tag_key = ?`,
      [tagKey],
    );
    return rows.map(mapRollTag);
  }

  async findOne(key: string): Promise<RollTag | null> {
    const rows = await this.databaseService.query(
      `SELECT * FROM roll_tags WHERE id = ?`,
      [key],
    );
    return rows.length > 0 ? mapRollTag(rows[0]) : null;
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM roll_tags WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }

  async syncAutoTag(
    rollKey: string,
    tagId: string,
    shouldApply: boolean,
  ): Promise<void> {
    const existing = await this.databaseService.query(
      `SELECT id FROM roll_tags WHERE roll_key = ? AND tag_key = ?`,
      [rollKey, tagId],
    );
    if (shouldApply && existing.length === 0) {
      await this.create({ rollKey, tagKey: tagId });
    } else if (!shouldApply && existing.length > 0) {
      await this.databaseService.execute(
        `DELETE FROM roll_tags WHERE roll_key = ? AND tag_key = ?`,
        [rollKey, tagId],
      );
    }
  }
}
