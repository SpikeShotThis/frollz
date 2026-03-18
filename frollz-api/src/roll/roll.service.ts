import { Injectable, BadRequestException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateRollDto } from "./dto/create-roll.dto";
import { UpdateRollDto } from "./dto/update-roll.dto";
import { TransitionRollDto } from "./dto/transition-roll.dto";
import { Roll, RollState } from "./entities/roll.entity";
import { RollStateService } from "../roll-state/roll-state.service";
import { RollTagService } from "../roll-tag/roll-tag.service";

const FORWARD_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.ADDED]: [
    RollState.FROZEN,
    RollState.REFRIGERATED,
    RollState.SHELVED,
  ],
  [RollState.FROZEN]: [RollState.REFRIGERATED, RollState.SHELVED],
  [RollState.REFRIGERATED]: [RollState.SHELVED],
  [RollState.SHELVED]: [RollState.LOADED],
  [RollState.LOADED]: [RollState.FINISHED],
  [RollState.FINISHED]: [RollState.SENT_FOR_DEVELOPMENT],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.DEVELOPED],
  [RollState.DEVELOPED]: [RollState.RECEIVED],
};

const BACKWARD_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.FROZEN]: [RollState.ADDED],
  [RollState.REFRIGERATED]: [RollState.FROZEN, RollState.ADDED],
  [RollState.SHELVED]: [RollState.REFRIGERATED, RollState.FROZEN],
  [RollState.LOADED]: [
    RollState.SHELVED,
    RollState.REFRIGERATED,
    RollState.FROZEN,
  ],
  [RollState.FINISHED]: [RollState.LOADED],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.FINISHED],
  [RollState.DEVELOPED]: [RollState.SENT_FOR_DEVELOPMENT],
  [RollState.RECEIVED]: [RollState.DEVELOPED],
};

const VALID_TRANSITIONS: Partial<Record<RollState, RollState[]>> =
  Object.fromEntries(
    Object.values(RollState).map((state) => [
      state,
      [
        ...(FORWARD_TRANSITIONS[state as RollState] ?? []),
        ...(BACKWARD_TRANSITIONS[state as RollState] ?? []),
      ],
    ]),
  ) as Partial<Record<RollState, RollState[]>>;

function mapRoll(row: Record<string, unknown>): Roll {
  return {
    _key: row.id as string,
    rollId: row.roll_id as string,
    stockKey: row.stock_key as string,
    state: row.state as RollState,
    imagesUrl: row.images_url as string | undefined,
    dateObtained: new Date(row.date_obtained as string),
    obtainmentMethod: row.obtainment_method as Roll["obtainmentMethod"],
    obtainedFrom: row.obtained_from as string,
    expirationDate: row.expiration_date
      ? new Date(row.expiration_date as string)
      : undefined,
    timesExposedToXrays: Number(row.times_exposed_to_xrays ?? 0),
    loadedInto: row.loaded_into as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

@Injectable()
export class RollService implements OnModuleInit {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rollStateService: RollStateService,
    private readonly rollTagService: RollTagService,
  ) {}

  async onModuleInit() {
    const rows = await this.databaseService.query<{
      id: string;
      expiration_date: string;
      date_obtained: string;
    }>(
      `SELECT id, expiration_date, date_obtained FROM rolls WHERE expiration_date IS NOT NULL`,
    );
    for (const row of rows) {
      await this.syncExpiredTag(
        row.id,
        new Date(row.expiration_date),
        new Date(row.date_obtained),
      );
    }
  }

  private async syncPushPullTags(
    rollKey: string,
    stockKey: string,
    shotISO?: number,
  ): Promise<void> {
    const stocks = await this.databaseService.query<{ speed: number }>(
      `SELECT speed FROM stocks WHERE id = ?`,
      [stockKey],
    );
    const stockSpeed = stocks.length > 0 ? Number(stocks[0].speed) : undefined;

    const pushed = !!(shotISO && stockSpeed && shotISO > stockSpeed);
    const pulled = !!(shotISO && stockSpeed && shotISO < stockSpeed);

    await this.rollTagService.syncAutoTag(rollKey, "pushed", pushed);
    await this.rollTagService.syncAutoTag(rollKey, "pulled", pulled);
  }

  private async syncExpiredTag(
    rollKey: string,
    expirationDate?: Date | null,
    dateObtained?: Date | null,
  ): Promise<void> {
    const shouldTag = !!(
      expirationDate &&
      dateObtained &&
      new Date(expirationDate) < new Date(dateObtained)
    );
    await this.rollTagService.syncAutoTag(rollKey, "expired", shouldTag);
  }

  async create(createRollDto: CreateRollDto): Promise<Roll> {
    const id = randomUUID();
    const dateObtained = createRollDto.dateObtained ?? new Date();

    let rollId = createRollDto.rollId;
    if (!rollId) {
      const stocks = await this.databaseService.query(
        `SELECT brand FROM stocks WHERE id = ?`,
        [createRollDto.stockKey],
      );
      const stockName =
        stocks.length > 0
          ? (stocks[0].brand as string).toLowerCase().replace(/\s+/g, "-")
          : "unknown";
      const datePart = new Date(dateObtained).toISOString().slice(0, 10);
      rollId = `roll-${stockName}-${datePart}`;
    }

    const now = new Date();

    const initialState = createRollDto.state ?? RollState.ADDED;

    await this.databaseService.execute(
      `INSERT INTO rolls (id, roll_id, stock_key, state, images_url, date_obtained, obtainment_method, obtained_from, expiration_date, times_exposed_to_xrays, loaded_into, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rollId,
        createRollDto.stockKey,
        initialState,
        createRollDto.imagesUrl ?? null,
        dateObtained,
        createRollDto.obtainmentMethod,
        createRollDto.obtainedFrom,
        createRollDto.expirationDate ?? null,
        createRollDto.timesExposedToXrays ?? 0,
        createRollDto.loadedInto ?? null,
        now,
        now,
      ],
    );

    await this.rollStateService.create({
      rollKey: id,
      state: initialState,
      date: now,
    });

    await this.syncExpiredTag(id, createRollDto.expirationDate, new Date(dateObtained));

    return {
      _key: id,
      rollId,
      stockKey: createRollDto.stockKey,
      state: initialState,
      imagesUrl: createRollDto.imagesUrl,
      dateObtained: new Date(dateObtained),
      obtainmentMethod: createRollDto.obtainmentMethod,
      obtainedFrom: createRollDto.obtainedFrom,
      expirationDate: createRollDto.expirationDate
        ? new Date(createRollDto.expirationDate)
        : undefined,
      timesExposedToXrays: createRollDto.timesExposedToXrays ?? 0,
      loadedInto: createRollDto.loadedInto,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getNextId(): Promise<string> {
    const rows = await this.databaseService.query(
      `SELECT COUNT(*) AS count FROM rolls`,
    );
    const count = Number(rows[0].count);
    return String(count + 1).padStart(5, "0");
  }

  async findAll(): Promise<Roll[]> {
    const rows = await this.databaseService.query(`SELECT * FROM rolls`);
    return rows.map(mapRoll);
  }

  async findOne(key: string): Promise<Roll | null> {
    const rows = await this.databaseService.query(
      `SELECT * FROM rolls WHERE id = ?`,
      [key],
    );
    return rows.length > 0 ? mapRoll(rows[0]) : null;
  }

  async update(
    key: string,
    updateRollDto: UpdateRollDto,
  ): Promise<Roll | null> {
    const fieldMap: Record<string, string> = {
      rollId: "roll_id",
      stockKey: "stock_key",
      state: "state",
      imagesUrl: "images_url",
      dateObtained: "date_obtained",
      obtainmentMethod: "obtainment_method",
      obtainedFrom: "obtained_from",
      expirationDate: "expiration_date",
      timesExposedToXrays: "times_exposed_to_xrays",
      loadedInto: "loaded_into",
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [prop, col] of Object.entries(fieldMap)) {
      if ((updateRollDto as Record<string, unknown>)[prop] !== undefined) {
        updates.push(`${col} = ?`);
        values.push((updateRollDto as Record<string, unknown>)[prop]);
      }
    }

    if (updates.length === 0) return this.findOne(key);

    updates.push(`updated_at = ?`);
    values.push(new Date());
    values.push(key);

    await this.databaseService.execute(
      `UPDATE rolls SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await this.findOne(key);
    if (updated) {
      await this.syncExpiredTag(key, updated.expirationDate, updated.dateObtained);
    }
    return updated;
  }

  async remove(key: string): Promise<boolean> {
    await this.databaseService.execute(`DELETE FROM rolls WHERE id = ?`, [key]);
    return true;
  }

  async transition(key: string, dto: TransitionRollDto): Promise<Roll | null> {
    const roll = await this.findOne(key);
    if (!roll) return null;

    const allowed = VALID_TRANSITIONS[roll.state];
    if (!allowed || !allowed.includes(dto.targetState)) {
      throw new BadRequestException(
        `Cannot transition from ${roll.state} to ${dto.targetState}`,
      );
    }

    await this.rollStateService.create({
      rollKey: key,
      state: dto.targetState,
      date: new Date(),
      notes: dto.notes,
      isErrorCorrection: dto.isErrorCorrection,
      metadata: dto.metadata,
    });

    if (dto.targetState === RollState.FINISHED) {
      const shotISO = dto.metadata?.shotISO as number | undefined;
      await this.syncPushPullTags(key, roll.stockKey, shotISO);
    }

    return this.update(key, { state: dto.targetState });
  }
}
