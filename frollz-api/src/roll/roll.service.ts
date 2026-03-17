import { Injectable, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateRollDto } from "./dto/create-roll.dto";
import { UpdateRollDto } from "./dto/update-roll.dto";
import { TransitionRollDto } from "./dto/transition-roll.dto";
import { Roll, RollState } from "./entities/roll.entity";
import { RollStateService } from "../roll-state/roll-state.service";

const VALID_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.ADDED]: [
    RollState.FROZEN,
    RollState.REFRIGERATED,
    RollState.SHELFED,
  ],
  [RollState.FROZEN]: [
    RollState.REFRIGERATED,
    RollState.SHELFED,
    RollState.ADDED,
  ],
  [RollState.REFRIGERATED]: [RollState.SHELFED, RollState.ADDED],
  [RollState.SHELFED]: [RollState.LOADED],
  [RollState.LOADED]: [RollState.FINISHED, RollState.SHELFED],
  [RollState.FINISHED]: [RollState.SENT_FOR_DEVELOPMENT, RollState.LOADED],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.DEVELOPED, RollState.FINISHED],
  [RollState.DEVELOPED]: [RollState.RECEIVED, RollState.SENT_FOR_DEVELOPMENT],
  [RollState.RECEIVED]: [RollState.DEVELOPED],
};

@Injectable()
export class RollService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rollStateService: RollStateService,
  ) {}

  async create(createRollDto: CreateRollDto): Promise<Roll> {
    const collection = this.databaseService.getCollection("rolls");

    const dateObtained = createRollDto.dateObtained ?? new Date();

    let rollId = createRollDto.rollId;
    if (!rollId) {
      const stockCursor = await this.databaseService.query(
        `FOR s IN stocks FILTER s._key == @key RETURN s`,
        { key: createRollDto.stockKey },
      );
      const stocks = await stockCursor.all();
      const stockName =
        stocks.length > 0
          ? (stocks[0].brand as string).toLowerCase().replace(/\s+/g, "-")
          : "unknown";
      const datePart = dateObtained.toISOString().slice(0, 10);
      rollId = `roll-${stockName}-${datePart}`;
    }

    const roll = {
      ...createRollDto,
      rollId,
      dateObtained,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.save(roll);
    return { ...roll, _key: result._key };
  }

  async getNextId(): Promise<string> {
    const cursor = await this.databaseService.query(`
      RETURN LENGTH(rolls)
    `);
    const results = await cursor.all();
    const count = results[0] as number;
    return String(count + 1).padStart(5, "0");
  }

  async findAll(): Promise<Roll[]> {
    const cursor = await this.databaseService.query(`
      FOR roll IN rolls
      RETURN roll
    `);

    return await cursor.all();
  }

  async findOne(key: string): Promise<Roll | null> {
    const cursor = await this.databaseService.query(
      `
      FOR roll IN rolls
      FILTER roll._key == @key
      RETURN roll
    `,
      { key },
    );

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async update(
    key: string,
    updateRollDto: UpdateRollDto,
  ): Promise<Roll | null> {
    const collection = this.databaseService.getCollection("rolls");

    const updateData = {
      ...updateRollDto,
      updatedAt: new Date(),
    };

    try {
      await collection.update(key, updateData);
      return await this.findOne(key);
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<boolean> {
    const collection = this.databaseService.getCollection("rolls");

    try {
      await collection.remove(key);
      return true;
    } catch {
      return false;
    }
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
    });

    return this.update(key, { state: dto.targetState });
  }
}
