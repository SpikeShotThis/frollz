import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { FILM_REPOSITORY } from '../../domain/film/repositories/film.repository.interface';
import { FilmKnexRepository } from '../../infrastructure/persistence/film/film.knex.repository';
import { EMULSION_REPOSITORY } from '../../domain/emulsion/repositories/emulsion.repository.interface';
import { EmulsionKnexRepository } from '../../infrastructure/persistence/emulsion/emulsion.knex.repository';
import { FORMAT_REPOSITORY } from '../../domain/shared/repositories/format.repository.interface';
import { FormatKnexRepository } from '../../infrastructure/persistence/shared/format.knex.repository';
import { TAG_REPOSITORY } from '../../domain/shared/repositories/tag.repository.interface';
import { TagKnexRepository } from '../../infrastructure/persistence/shared/tag.knex.repository';
import { ExportService } from './application/export.service';
import { ExportImportController } from './export-import.controller';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: FILM_REPOSITORY, useClass: FilmKnexRepository },
    { provide: EMULSION_REPOSITORY, useClass: EmulsionKnexRepository },
    { provide: FORMAT_REPOSITORY, useClass: FormatKnexRepository },
    { provide: TAG_REPOSITORY, useClass: TagKnexRepository },
    ExportService,
  ],
  controllers: [ExportImportController],
})
export class ExportImportModule {}
