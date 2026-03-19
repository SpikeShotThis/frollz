import { ConflictException, Injectable } from "@nestjs/common";
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
       VALUES (?, ?, ?, ?, ?)`,
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
      `SELECT * FROM film_formats WHERE id = ?`,
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

    if (updateFilmFormatDto.formFactor !== undefined) {
      updates.push(`form_factor = ?`);
      values.push(updateFilmFormatDto.formFactor);
    }
    if (updateFilmFormatDto.format !== undefined) {
      updates.push(`format = ?`);
      values.push(updateFilmFormatDto.format);
    }

    if (updates.length === 0) return this.findOne(key);

    updates.push(`updated_at = ?`);
    values.push(new Date());
    values.push(key);

    await this.databaseService.execute(
      `UPDATE film_formats SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    return this.findOne(key);
  }

  async remove(key: string): Promise<boolean> {
    const dependents = await this.databaseService.query<{ id: string }>(
      `SELECT id FROM stocks WHERE format_key = ? LIMIT 1`,
      [key],
    );
    if (dependents.length > 0) {
      throw new ConflictException(
        "Cannot delete film format: it is referenced by one or more stocks",
      );
    }

    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM film_formats WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }
}
