import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateRollStateDto } from "./dto/create-roll-state.dto";
import { RollStateHistory } from "./entities/roll-state.entity";

function mapRollState(row: Record<string, unknown>): RollStateHistory {
  return {
    _key: row.id as string,
    stateId: row.state_id as string,
    rollId: row.roll_id as string,
    state: row.state as RollStateHistory["state"],
    date: new Date(row.date as string),
    notes: row.notes as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

@Injectable()
export class RollStateService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateRollStateDto): Promise<RollStateHistory> {
    const id = randomUUID();
    const stateId = randomUUID();
    const now = new Date();
    const date = dto.date ?? now;

    await this.databaseService.execute(
      `INSERT INTO roll_states (id, state_id, roll_id, state, date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, stateId, dto.rollKey, dto.state, date, dto.notes ?? null, now, now],
    );

    return {
      _key: id,
      stateId,
      rollId: dto.rollKey,
      state: dto.state,
      date,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findByRollKey(rollKey: string): Promise<RollStateHistory[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM roll_states WHERE roll_id = $1 ORDER BY date ASC`,
      [rollKey],
    );
    return rows.map(mapRollState);
  }
}
