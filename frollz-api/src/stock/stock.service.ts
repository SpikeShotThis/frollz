import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Stock } from './entities/stock.entity';

@Injectable()
export class StockService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createStockDto: CreateStockDto): Promise<Stock> {
    const collection = this.databaseService.getCollection('stocks');
    
    const stock = {
      ...createStockDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.save(stock);
    return { ...stock, _key: result._key };
  }

  async findAll(): Promise<Stock[]> {
    const cursor = await this.databaseService.query(`
      FOR stock IN stocks
      LET fmt = FIRST(FOR f IN film_formats FILTER f._key == stock.formatKey RETURN f)
      RETURN MERGE(stock, { format: fmt ? fmt.format : stock.format })
    `);

    return await cursor.all();
  }

  async findOne(key: string): Promise<Stock | null> {
    const cursor = await this.databaseService.query(`
      FOR stock IN stocks
      FILTER stock._key == @key
      LET fmt = FIRST(FOR f IN film_formats FILTER f._key == stock.formatKey RETURN f)
      RETURN MERGE(stock, { format: fmt ? fmt.format : stock.format })
    `, { key });

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async update(key: string, updateStockDto: UpdateStockDto): Promise<Stock | null> {
    const collection = this.databaseService.getCollection('stocks');
    
    const updateData = {
      ...updateStockDto,
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
    const collection = this.databaseService.getCollection('stocks');

    try {
      await collection.remove(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getBrands(query: string): Promise<string[]> {
    const cursor = await this.databaseService.query(
      `FOR stock IN stocks
       FILTER CONTAINS(LOWER(stock.brand), LOWER(@query))
       RETURN DISTINCT stock.brand`,
      { query },
    );
    return await cursor.all();
  }

  async getManufacturers(query: string): Promise<string[]> {
    const cursor = await this.databaseService.query(
      `FOR stock IN stocks
       FILTER CONTAINS(LOWER(stock.manufacturer), LOWER(@query))
       RETURN DISTINCT stock.manufacturer`,
      { query },
    );
    return await cursor.all();
  }
}