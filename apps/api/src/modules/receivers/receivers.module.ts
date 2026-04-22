import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { ReceiversController } from './receivers.controller.js';
import { ReceiversService } from './receivers.service.js';
import { ReceiverRepository } from '../../infrastructure/repositories/receiver.repository.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { MikroOrmReceiverRepository } from '../../infrastructure/repositories/mikro-orm-receiver.repository.js';
import { MikroOrmFilmRepository } from '../../infrastructure/repositories/mikro-orm-film.repository.js';

@Module({
  controllers: [ReceiversController],
  providers: [
    ReceiversService,
    IdempotencyService,
    { provide: ReceiverRepository, useClass: MikroOrmReceiverRepository },
    { provide: FilmRepository, useClass: MikroOrmFilmRepository }
  ],
  exports: [ReceiversService]
})
export class ReceiversModule { }
