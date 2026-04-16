import { Inject, Injectable } from "@nestjs/common";
import { Film } from "../../../domain/film/entities/film.entity";
import {
  IFilmRepository,
  FILM_REPOSITORY,
} from "../../../domain/film/repositories/film.repository.interface";
import { Emulsion } from "../../../domain/emulsion/entities/emulsion.entity";
import {
  IEmulsionRepository,
  EMULSION_REPOSITORY,
} from "../../../domain/emulsion/repositories/emulsion.repository.interface";
import { Format } from "../../../domain/shared/entities/format.entity";
import {
  IFormatRepository,
  FORMAT_REPOSITORY,
} from "../../../domain/shared/repositories/format.repository.interface";
import { Tag } from "../../../domain/shared/entities/tag.entity";
import {
  ITagRepository,
  TAG_REPOSITORY,
} from "../../../domain/shared/repositories/tag.repository.interface";

export interface FilmsExportEnvelope {
  version: string;
  exportedAt: string;
  films: Film[];
}

export interface LibraryExportEnvelope {
  version: string;
  exportedAt: string;
  emulsions: Emulsion[];
  formats: Format[];
  tags: Tag[];
}

@Injectable()
export class ExportService {
  constructor(
    @Inject(FILM_REPOSITORY) private readonly filmRepo: IFilmRepository,
    @Inject(EMULSION_REPOSITORY)
    private readonly emulsionRepo: IEmulsionRepository,
    @Inject(FORMAT_REPOSITORY) private readonly formatRepo: IFormatRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: ITagRepository,
  ) {}

  async exportFilmsJson(): Promise<FilmsExportEnvelope> {
    const films = await this.filmRepo.findAll();
    return {
      version: process.env.APP_VERSION ?? "unknown",
      exportedAt: new Date().toISOString(),
      films,
    };
  }

  async exportLibraryJson(): Promise<LibraryExportEnvelope> {
    const [emulsions, formats, tags] = await Promise.all([
      this.emulsionRepo.findAll(),
      this.formatRepo.findAll(),
      this.tagRepo.findAll(),
    ]);
    return {
      version: process.env.APP_VERSION ?? "unknown",
      exportedAt: new Date().toISOString(),
      emulsions,
      formats,
      tags,
    };
  }
}
