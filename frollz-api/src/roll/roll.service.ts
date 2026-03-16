import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRollDto } from './dto/create-roll.dto';
import { UpdateRollDto } from './dto/update-roll.dto';
import { Roll } from './entities/roll.entity';

@Injectable()
export class RollService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createRollDto: CreateRollDto): Promise<Roll> {
    const collection = this.databaseService.getCollection('rolls');

    const dateObtained = createRollDto.dateObtained ?? new Date();

    let rollId = createRollDto.rollId;
    if (!rollId) {
      const stockCursor = await this.databaseService.query(
        `FOR s IN stocks FILTER s._key == @key RETURN s`,
        { key: createRollDto.stockKey },
      );
      const stocks = await stockCursor.all();
      const stockName = stocks.length > 0
        ? (stocks[0].brand as string).toLowerCase().replace(/\s+/g, '-')
        : 'unknown';
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

  async findAll(): Promise<Roll[]> {
    const cursor = await this.databaseService.query(`
      FOR roll IN rolls
      RETURN roll
    `);
    
    return await cursor.all();
  }

  async findOne(key: string): Promise<Roll | null> {
    const cursor = await this.databaseService.query(`
      FOR roll IN rolls
      FILTER roll._key == @key
      RETURN roll
    `, { key });

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async update(key: string, updateRollDto: UpdateRollDto): Promise<Roll | null> {
    const collection = this.databaseService.getCollection('rolls');
    
    const updateData = {
      ...updateRollDto,
      updatedAt: new Date(),
    };

    try {
      await collection.update(key, updateData);
      return await this.findOne(key);
    } catch (error) {
      return null;
    }
  }

  async remove(key: string): Promise<boolean> {
    const collection = this.databaseService.getCollection('rolls');
    
    try {
      await collection.remove(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}