import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const collection = this.databaseService.getCollection('tags');

    const tag = {
      ...createTagDto,
      createdAt: new Date(),
    };

    const result = await collection.save(tag);
    return { ...tag, _key: result._key };
  }

  async findAll(): Promise<Tag[]> {
    const cursor = await this.databaseService.query(`
      FOR tag IN tags
      SORT tag.value ASC
      RETURN tag
    `);
    return await cursor.all();
  }

  async findOne(key: string): Promise<Tag | null> {
    const cursor = await this.databaseService.query(`
      FOR tag IN tags
      FILTER tag._key == @key
      RETURN tag
    `, { key });

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async update(key: string, updateTagDto: UpdateTagDto): Promise<Tag | null> {
    const collection = this.databaseService.getCollection('tags');

    try {
      await collection.update(key, updateTagDto);
      return await this.findOne(key);
    } catch (error) {
      return null;
    }
  }

  async remove(key: string): Promise<boolean> {
    const collection = this.databaseService.getCollection('tags');

    try {
      await collection.remove(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}
