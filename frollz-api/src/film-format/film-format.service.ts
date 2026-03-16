import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateFilmFormatDto } from './dto/create-film-format.dto';
import { UpdateFilmFormatDto } from './dto/update-film-format.dto';
import { FilmFormat } from './entities/film-format.entity';

@Injectable()
export class FilmFormatService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createFilmFormatDto: CreateFilmFormatDto): Promise<FilmFormat> {
    const collection = this.databaseService.getCollection('film_formats');
    
    const filmFormat = {
      ...createFilmFormatDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.save(filmFormat);
    return { ...filmFormat, _key: result._key };
  }

  async findAll(): Promise<FilmFormat[]> {
    const cursor = await this.databaseService.query(`
      FOR format IN film_formats
      RETURN format
    `);
    
    return await cursor.all();
  }

  async findOne(key: string): Promise<FilmFormat | null> {
    const cursor = await this.databaseService.query(`
      FOR format IN film_formats
      FILTER format._key == @key
      RETURN format
    `, { key });

    const results = await cursor.all();
    return results.length > 0 ? results[0] : null;
  }

  async update(key: string, updateFilmFormatDto: UpdateFilmFormatDto): Promise<FilmFormat | null> {
    const collection = this.databaseService.getCollection('film_formats');
    
    const updateData = {
      ...updateFilmFormatDto,
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
    const collection = this.databaseService.getCollection('film_formats');
    
    try {
      await collection.remove(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}