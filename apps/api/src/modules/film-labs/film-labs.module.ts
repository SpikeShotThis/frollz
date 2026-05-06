import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { FilmLabRepository } from '../../infrastructure/repositories/film-lab.repository.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { MikroOrmFilmLabRepository } from '../../infrastructure/repositories/mikro-orm-film-lab.repository.js';
import { FilmLabsController } from './film-labs.controller.js';
import { FilmLabsService } from './film-labs.service.js';

@Module({
  imports: [ReferenceModule],
  controllers: [FilmLabsController],
  providers: [FilmLabsService, IdempotencyService, { provide: FilmLabRepository, useClass: MikroOrmFilmLabRepository }],
  exports: [FilmLabsService, FilmLabRepository]
})
export class FilmLabsModule {}
