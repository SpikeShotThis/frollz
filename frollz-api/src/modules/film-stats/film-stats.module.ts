import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { FILM_STATS_REPOSITORY } from '../../domain/film-stats/repositories/film-stats.repository.interface';
import { FilmStatsKnexRepository } from '../../infrastructure/persistence/film-stats/film-stats.knex.repository';
import { FilmStatsService } from './application/film-stats.service';
import { FilmStatsController } from './film-stats.controller';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: FILM_STATS_REPOSITORY, useClass: FilmStatsKnexRepository },
    FilmStatsService,
  ],
  controllers: [FilmStatsController],
})
export class FilmStatsModule {}
