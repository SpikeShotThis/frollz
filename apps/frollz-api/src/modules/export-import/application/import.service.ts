import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { Film } from "../../../domain/film/entities/film.entity";
import {
  IFilmRepository,
  FILM_REPOSITORY,
} from "../../../domain/film/repositories/film.repository.interface";
import { FilmState } from "../../../domain/film-state/entities/film-state.entity";
import {
  IFilmStateRepository,
  FILM_STATE_REPOSITORY,
} from "../../../domain/film-state/repositories/film-state.repository.interface";
import {
  IFilmTagRepository,
  FILM_TAG_REPOSITORY,
} from "../../../domain/film-tag/repositories/film-tag.repository.interface";
import {
  IEmulsionRepository,
  EMULSION_REPOSITORY,
} from "../../../domain/emulsion/repositories/emulsion.repository.interface";
import { Tag } from "../../../domain/shared/entities/tag.entity";
import {
  ITagRepository,
  TAG_REPOSITORY,
} from "../../../domain/shared/repositories/tag.repository.interface";
import {
  ITransitionStateRepository,
  TRANSITION_STATE_REPOSITORY,
} from "../../../domain/transition/repositories/transition-state.repository.interface";
import {
  ITransitionProfileRepository,
  TRANSITION_PROFILE_REPOSITORY,
} from "../../../domain/transition/repositories/transition-profile.repository.interface";
import {
  INoteRepository,
  NOTE_REPOSITORY,
} from "../../../domain/shared/repositories/note.repository.interface";
import { Note } from "../../../domain/shared/entities/note.entity";
export interface ImportRowError {
  row: number;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportRowError[];
}

const TEMPLATE_HEADER = "name,emulsion,tags,notes";
const TEMPLATE_EXAMPLE =
  "Roll 001,Kodak Portra 400,landscape|expired,Shot in Portugal";
const DEFAULT_EXPIRATION = new Date("2099-12-31");
const DEFAULT_TAG_COLOR = "#6B7280";

@Injectable()
export class ImportService {
  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
    @Inject(FILM_STATE_REPOSITORY)
    private readonly filmStateRepo: IFilmStateRepository,
    @Inject(FILM_TAG_REPOSITORY)
    private readonly filmTagRepo: IFilmTagRepository,
    @Inject(EMULSION_REPOSITORY)
    private readonly emulsionRepo: IEmulsionRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: ITagRepository,
    @Inject(TRANSITION_STATE_REPOSITORY)
    private readonly transitionStateRepo: ITransitionStateRepository,
    @Inject(TRANSITION_PROFILE_REPOSITORY)
    private readonly transitionProfileRepo: ITransitionProfileRepository,
    @Inject(NOTE_REPOSITORY) private readonly noteRepo: INoteRepository,
  ) {}

  getTemplate(): string {
    return `${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}\n`;
  }

  async importFilms(buffer: Buffer): Promise<ImportResult> {
    const [importedState, standardProfile] = await Promise.all([
      this.transitionStateRepo.findByName("Imported"),
      this.transitionProfileRepo.findByName("standard"),
    ]);

    if (!importedState)
      throw new BadRequestException(
        "Transition state 'Imported' is not seeded",
      );
    if (!standardProfile)
      throw new BadRequestException(
        "Transition profile 'standard' is not seeded",
      );

    let rows: Record<string, string>[];
    try {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException(
        "Failed to parse CSV — ensure the file is valid UTF-8 CSV",
      );
    }

    const errors: ImportRowError[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // 1-based, offset by header row
      const row = rows[i];

      const name = row["name"]?.trim();
      if (!name) {
        errors.push({ row: rowNum, reason: "Missing required field: name" });
        skipped++;
        continue;
      }

      const emulsionName = row["emulsion"]?.trim();
      if (!emulsionName) {
        errors.push({
          row: rowNum,
          reason: "Missing required field: emulsion",
        });
        skipped++;
        continue;
      }

      const emulsion = await this.emulsionRepo.findByBrand(emulsionName);
      if (!emulsion) {
        errors.push({
          row: rowNum,
          reason: `Unknown emulsion: "${emulsionName}"`,
        });
        skipped++;
        continue;
      }

      const note = row["notes"]?.trim() || null;
      const tagNames = row["tags"]
        ? row["tags"]
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      try {
        const film = Film.create({
          name,
          emulsionId: emulsion.id,
          expirationDate: DEFAULT_EXPIRATION,
          parentId: null,
          transitionProfileId: standardProfile.id,
        });
        const filmId = await this.filmRepo.save(film);

        const filmState = FilmState.create({
          filmId,
          stateId: importedState.id,
          date: new Date(),
        });
        await this.filmStateRepo.save(filmState);
        if (note) {
          await this.noteRepo.save(
            Note.create({
              entity_id: filmState.id,
              entity_type: "film_state",
              text: note,
              created_at: filmState.date,
            }),
          );
        }

        for (const tagName of tagNames) {
          const tag = await this.findOrCreateTag(tagName);
          await this.filmTagRepo.add(filmId, tag.id);
        }

        imported++;
      } catch {
        errors.push({
          row: rowNum,
          reason: "Internal error saving film — row skipped",
        });
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  private async findOrCreateTag(name: string): Promise<Tag> {
    const existing = await this.tagRepo.findByName(name);
    if (existing) return existing;

    const newTag = Tag.create({ name, colorCode: DEFAULT_TAG_COLOR });
    const newId = await this.tagRepo.save(newTag);
    const saved = await this.tagRepo.findById(newId);
    return saved!;
  }
}
