import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { EmulsionRepository } from '../../infrastructure/repositories/emulsion.repository.js';
import { MikroOrmEmulsionRepository } from '../../infrastructure/repositories/mikro-orm-emulsion.repository.js';
import { EmulsionsController } from './emulsions.controller.js';
import { EmulsionsService } from './emulsions.service.js';
import { ReferenceModule } from '../reference/reference.module.js';

@Module({
  imports: [ReferenceModule],
  controllers: [EmulsionsController],
  providers: [EmulsionsService, IdempotencyService, { provide: EmulsionRepository, useClass: MikroOrmEmulsionRepository }],
  exports: [EmulsionsService]
})
export class EmulsionsModule { }
