import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { FILM_REPOSITORY } from '../../domain/film/repositories/film.repository.interface';
import { FilmKnexRepository } from '../../infrastructure/persistence/film/film.knex.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: FILM_REPOSITORY,
      useClass: FilmKnexRepository,
    },
  ],
  exports: [FILM_REPOSITORY],
})
export class FilmModule {}
