import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateFilmFormatDto } from "./dto/create-film-format.dto";
import { UpdateFilmFormatDto } from "./dto/update-film-format.dto";
import { FilmFormat } from "./entities/film-format.entity";

function mapFilmFormat(row: Record<string, unknown>): FilmFormat {
  return {
    _key: row.id as string,
    formFactor: row.form_factor as FilmFormat["formFactor"],
    format: row.format as FilmFormat["format"],
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

@Injectable()
export class FilmFormatService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createFilmFormatDto: CreateFilmFormatDto): Promise<FilmFormat> {
    const id = randomUUID();
    const now = new Date();

    await this.databaseService.execute(
      `INSERT INTO film_formats (id, form_factor, format, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        createFilmFormatDto.formFactor,
        createFilmFormatDto.format,
        now,
        now,
      ],
    );

    return {
      _key: id,
      formFactor: createFilmFormatDto.formFactor,
      format: createFilmFormatDto.format,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findAll(): Promise<FilmFormat[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM film_formats ORDER BY form_factor, format`,
    );
    return rows.map(mapFilmFormat);
  }

  async findOne(key: string): Promise<FilmFormat | null> {
    const rows = await this.databaseService.query(
      `SELECT * FROM film_formats WHERE id = $1`,
      [key],
    );
    return rows.length > 0 ? mapFilmFormat(rows[0]) : null;
  }

  async update(
    key: string,
    updateFilmFormatDto: UpdateFilmFormatDto,
  ): Promise<FilmFormat | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updateFilmFormatDto.formFactor !== undefined) {
      updates.push(`form_factor = $${idx++}`);
      values.push(updateFilmFormatDto.formFactor);
    }
    if (updateFilmFormatDto.format !== undefined) {
      updates.push(`format = $${idx++}`);
      values.push(updateFilmFormatDto.format);
    }

    if (updates.length === 0) return this.findOne(key);

    updates.push(`updated_at = $${idx++}`);
    values.push(new Date());
    values.push(key);

    await this.databaseService.execute(
      `UPDATE film_formats SET ${updates.join(", ")} WHERE id = $${idx}`,
      values,
    );

    return this.findOne(key);
  }

  async remove(key: string): Promise<boolean> {
    await this.databaseService.execute(
      `DELETE FROM film_formats WHERE id = $1`,
      [key],
    );
    return true;
  }
}
