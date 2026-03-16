import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateStockTagDto } from './dto/create-stock-tag.dto';
import { StockTag } from './entities/stock-tag.entity';

@Injectable()
export class StockTagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createStockTagDto: CreateStockTagDto): Promise<StockTag> {
    const collection = this.databaseService.getCollection('stock_tags');

    const stockTag = {
      ...createStockTagDto,
      createdAt: new Date(),
    };

    const result = await collection.save(stockTag);
    return { ...stockTag, _key: result._key };
  }

  async findAll(): Promise<StockTag[]> {
    const cursor = await this.databaseService.query(`
      FOR st IN stock_tags
      RETURN st
    `);
    return await cursor.all();
  }

  async findByStock(stockKey: string): Promise<StockTag[]> {
    const cursor = await this.databaseService.query(`
      FOR st IN stock_tags
      FILTER st.stockKey == @stockKey
      RETURN st
    `, { stockKey });
    return await cursor.all();
  }

  async findByTag(tagKey: string): Promise<StockTag[]> {
    const cursor = await this.databaseService.query(`
      FOR st IN stock_tags
      FILTER st.tagKey == @tagKey
      RETURN st
    `, { tagKey });
    return await cursor.all();
  }

  async findOne(key: string): Promise<StockTag | null> {
    const cursor = await this.databaseService.query(`
      FOR st IN stock_tags
      FILTER st._key == @key
      RETURN st
    `, { key });

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async remove(key: string): Promise<boolean> {
    const collection = this.databaseService.getCollection('stock_tags');

    try {
      await collection.remove(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}
