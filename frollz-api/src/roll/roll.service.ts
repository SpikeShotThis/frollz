import {
  Injectable,
  BadRequestException,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateRollDto } from "./dto/create-roll.dto";
import { UpdateRollDto } from "./dto/update-roll.dto";
import { TransitionRollDto } from "./dto/transition-roll.dto";
import { Roll, RollState, ObtainmentMethod } from "./entities/roll.entity";
import { RollStateService } from "../roll-state/roll-state.service";
import { RollTagService } from "../roll-tag/roll-tag.service";
import { TransitionService } from "../transition/transition.service";
import { TransitionMetadataField } from "../transition/entities/transition.entity";

const ROLLS_WITH_CHILD_COUNT_QUERY = `
  SELECT r.*, s.brand AS stock_name, s.speed AS stock_speed, s.process AS stock_process, f.format AS format_name,
    (SELECT COUNT(*) FROM rolls c WHERE c.parent_roll_id = r.id)::int AS child_roll_count
  FROM rolls r
  LEFT JOIN stocks s ON r.stock_key = s.id
  LEFT JOIN film_formats f ON s.format_key = f.id
`;

const logger = new Logger("RollService");

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
    stockName: (row.stock_name as string | null) ?? undefined,
    stockSpeed: row.stock_speed != null ? Number(row.stock_speed) : undefined,
    formatName: (row.format_name as string | null) ?? undefined,
    process: (row.stock_process as string | null) ?? undefined,
    transitionProfile: (row.transition_profile as string | null) ?? "standard",
    parentRollId: (row.parent_roll_id as string | null) ?? undefined,
    childRollCount:
      row.child_roll_count != null ? Number(row.child_roll_count) : undefined,
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
    private readonly transitionService: TransitionService,
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

  private async syncCrossProcessedTag(
    rollKey: string,
    stockKey: string,
    processRequested?: string,
  ): Promise<void> {
    if (!processRequested) return;
    const stocks = await this.databaseService.query<{ process: string }>(
      `SELECT process FROM stocks WHERE id = ?`,
      [stockKey],
    );
    if (stocks.length === 0) return;
    const isCrossProcessed = processRequested !== stocks[0].process;
    await this.rollTagService.syncAutoTag(
      rollKey,
      "cross-processed",
      isCrossProcessed,
    );
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

  async findByStates(rolesArray: RollState[]): Promise<Roll[]> {
    if (rolesArray.length === 0) {
      return [];
    } else {
      const rollString = rolesArray.map((state) => `'${state}'`).join(", ");
      logger.debug(`Filtering rolls by states: ${rollString}`);
      const rows = await this.databaseService.query(
        `${ROLLS_WITH_CHILD_COUNT_QUERY} WHERE r.state IN (${rollString})`,
      );
      return rows.map(mapRoll);
    }
  }
  async create(createRollDto: CreateRollDto): Promise<Roll> {
    const id = randomUUID();
    const dateObtained = createRollDto.dateObtained ?? new Date();

    let rollId = createRollDto.rollId;
    if (!rollId) {
      rollId = await this.getNextId();
    }

    const now = new Date();
    const initialState = createRollDto.state ?? RollState.ADDED;

    // Resolve stockKey and transition profile
    let stockKey: string;
    let transitionProfile: string;

    if (createRollDto.parentRollId) {
      // Child roll: inherit stock from parent, profile from parent's stock process
      const parentRows = await this.databaseService.query<{
        stock_key: string;
        roll_id: string;
        transition_profile: string;
        stock_process: string | null;
        expiration_date: string | null;
      }>(
        `SELECT r.stock_key, r.roll_id, r.transition_profile, r.expiration_date, s.process AS stock_process FROM rolls r LEFT JOIN stocks s ON r.stock_key = s.id WHERE r.id = ?`,
        [createRollDto.parentRollId],
      );
      if (parentRows.length === 0) {
        throw new BadRequestException(
          `Parent roll '${createRollDto.parentRollId}' not found`,
        );
      }
      if (parentRows[0].transition_profile !== "bulk") {
        throw new BadRequestException(
          `Parent roll '${createRollDto.parentRollId}' is not a bulk roll`,
        );
      }
      stockKey = parentRows[0].stock_key;
      transitionProfile =
        parentRows[0].stock_process === "Instant" ? "instant" : "standard";
      // Inherit provenance and expiration from the bulk canister
      createRollDto.obtainmentMethod = ObtainmentMethod.SELF_ROLLED;
      createRollDto.obtainedFrom = `Bulk Roll (${parentRows[0].roll_id})`;
      if (parentRows[0].expiration_date) {
        createRollDto.expirationDate = new Date(parentRows[0].expiration_date);
      }
    } else {
      if (!createRollDto.stockKey) {
        throw new BadRequestException(
          "stockKey is required when parentRollId is not provided",
        );
      }
      stockKey = createRollDto.stockKey;

      if (createRollDto.isBulkRoll) {
        transitionProfile = "bulk";
      } else {
        const stockRows = await this.databaseService.query<{
          process: string;
        }>(`SELECT process FROM stocks WHERE id = ?`, [stockKey]);
        transitionProfile =
          stockRows.length > 0 && stockRows[0].process === "Instant"
            ? "instant"
            : "standard";
      }
    }

    if (!createRollDto.obtainmentMethod) {
      throw new BadRequestException(
        "obtainmentMethod is required for non-child rolls",
      );
    }
    if (!createRollDto.obtainedFrom) {
      throw new BadRequestException(
        "obtainedFrom is required for non-child rolls",
      );
    }

    await this.databaseService.execute(
      `INSERT INTO rolls (id, roll_id, stock_key, state, images_url, date_obtained, obtainment_method, obtained_from, expiration_date, times_exposed_to_xrays, loaded_into, transition_profile, parent_roll_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rollId,
        stockKey,
        initialState,
        createRollDto.imagesUrl ?? null,
        dateObtained,
        createRollDto.obtainmentMethod,
        createRollDto.obtainedFrom,
        createRollDto.expirationDate ?? null,
        createRollDto.timesExposedToXrays ?? 0,
        createRollDto.loadedInto ?? null,
        transitionProfile,
        createRollDto.parentRollId ?? null,
        now,
        now,
      ],
    );

    await this.rollStateService.create({
      rollKey: id,
      state: initialState,
      date: now,
    });

    await this.syncExpiredTag(
      id,
      createRollDto.expirationDate,
      new Date(dateObtained),
    );

    return {
      _key: id,
      rollId,
      stockKey,
      state: initialState,
      imagesUrl: createRollDto.imagesUrl,
      dateObtained: new Date(dateObtained),
      obtainmentMethod: createRollDto.obtainmentMethod!,
      obtainedFrom: createRollDto.obtainedFrom!,
      expirationDate: createRollDto.expirationDate
        ? new Date(createRollDto.expirationDate)
        : undefined,
      timesExposedToXrays: createRollDto.timesExposedToXrays ?? 0,
      loadedInto: createRollDto.loadedInto,
      transitionProfile,
      parentRollId: createRollDto.parentRollId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getNextId(): Promise<string> {
    const rows = await this.databaseService.query<{ nextval: string }>(
      `SELECT nextval('roll_id_seq')`,
    );
    return String(rows[0].nextval).padStart(5, "0");
  }

  async findAll(): Promise<Roll[]> {
    const rows = await this.databaseService.query(ROLLS_WITH_CHILD_COUNT_QUERY);
    return rows.map(mapRoll);
  }

  async findOne(key: string): Promise<Roll | null> {
    const rows = await this.databaseService.query(
      `${ROLLS_WITH_CHILD_COUNT_QUERY} WHERE r.id = ?`,
      [key],
    );
    return rows.length > 0 ? mapRoll(rows[0]) : null;
  }

  async findChildren(key: string): Promise<Roll[]> {
    const rows = await this.databaseService.query(
      `${ROLLS_WITH_CHILD_COUNT_QUERY} WHERE r.parent_roll_id = ?`,
      [key],
    );
    return rows.map(mapRoll);
  }

  async update(
    key: string,
    updateRollDto: UpdateRollDto,
  ): Promise<Roll | null> {
    // Child rolls have their stock locked to the parent's stock
    if (updateRollDto.stockKey !== undefined) {
      const roll = await this.findOne(key);
      if (roll?.parentRollId) {
        throw new BadRequestException(
          "Cannot change the stock of a child roll — it is inherited from the parent bulk roll",
        );
      }
    }

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
      await this.syncExpiredTag(
        key,
        updated.expirationDate,
        updated.dateObtained,
      );
    }
    return updated;
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM rolls WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }

  async transition(key: string, dto: TransitionRollDto): Promise<Roll | null> {
    const roll = await this.findOne(key);
    if (!roll) return null;

    const edge = await this.transitionService.getTransitionEdge(
      roll.state,
      dto.targetState,
      roll.transitionProfile ?? "standard",
    );
    if (!edge) {
      throw new BadRequestException(
        `Cannot transition from ${roll.state} to ${dto.targetState}`,
      );
    }

    const metadata = this.validateAndStripMetadata(dto.metadata, edge.metadata);

    await this.rollStateService.create({
      rollKey: key,
      state: dto.targetState,
      date: dto.date ? new Date(dto.date) : new Date(),
      notes: dto.notes,
      isErrorCorrection: dto.isErrorCorrection,
      metadata,
    });

    if (dto.targetState === RollState.FINISHED) {
      const shotISO = metadata?.shotISO as number | undefined;
      await this.syncPushPullTags(key, roll.stockKey, shotISO);
    }

    if (dto.targetState === RollState.SENT_FOR_DEVELOPMENT) {
      const processRequested = metadata?.processRequested as string | undefined;
      await this.syncCrossProcessedTag(key, roll.stockKey, processRequested);
    }

    return this.update(key, { state: dto.targetState });
  }

  private validateAndStripMetadata(
    incoming: Record<string, unknown> | undefined,
    expectedFields: TransitionMetadataField[],
  ): Record<string, string | number | boolean> | undefined {
    if (expectedFields.length === 0) return undefined;

    const result: Record<string, string | number | boolean> = {};

    for (const field of expectedFields) {
      const value = incoming?.[field.field];

      if (value === undefined || value === null) {
        if (field.isRequired) {
          throw new BadRequestException(
            `Metadata field '${field.field}' is required`,
          );
        }
        continue;
      }

      if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
      ) {
        throw new BadRequestException(
          `Metadata field '${field.field}' must be a string, number, or boolean`,
        );
      }

      result[field.field] = value;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }
}
