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
import { FILM_STATE_REPOSITORY } from '../../domain/film-state/repositories/film-state.repository.interface';
import { FilmStateKnexRepository } from '../../infrastructure/persistence/film-state/film-state.knex.repository';
import { FILM_TAG_REPOSITORY } from '../../domain/film-tag/repositories/film-tag.repository.interface';
import { FilmTagKnexRepository } from '../../infrastructure/persistence/film-tag/film-tag.knex.repository';
import { TRANSITION_STATE_REPOSITORY } from '../../domain/transition/repositories/transition-state.repository.interface';
import { TransitionStateKnexRepository } from '../../infrastructure/persistence/transition/transition-state.knex.repository';
import { TRANSITION_PROFILE_REPOSITORY } from '../../domain/transition/repositories/transition-profile.repository.interface';
import { TransitionProfileKnexRepository } from '../../infrastructure/persistence/transition/transition-profile.knex.repository';
import { ExportService } from './application/export.service';
import { ImportService } from './application/import.service';
import { LibraryImportService } from './application/library-import.service';
import { FilmsJsonImportService } from './application/films-json-import.service';
import { ExportImportController } from './export-import.controller';
import { NoteKnexRepository } from '../../infrastructure/persistence/shared/note.knex.repository';
import { NOTE_REPOSITORY } from '../../domain/shared/repositories/note.repository.interface';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: FILM_REPOSITORY, useClass: FilmKnexRepository },
    { provide: EMULSION_REPOSITORY, useClass: EmulsionKnexRepository },
    { provide: FORMAT_REPOSITORY, useClass: FormatKnexRepository },
    { provide: TAG_REPOSITORY, useClass: TagKnexRepository },
    { provide: FILM_STATE_REPOSITORY, useClass: FilmStateKnexRepository },
    { provide: FILM_TAG_REPOSITORY, useClass: FilmTagKnexRepository },
    { provide: TRANSITION_STATE_REPOSITORY, useClass: TransitionStateKnexRepository },
    { provide: TRANSITION_PROFILE_REPOSITORY, useClass: TransitionProfileKnexRepository },
    { provide: NOTE_REPOSITORY, useClass: NoteKnexRepository },
    ExportService,
    ImportService,
    LibraryImportService,
    FilmsJsonImportService,
  ],
  controllers: [ExportImportController],
})
export class ExportImportModule { }
