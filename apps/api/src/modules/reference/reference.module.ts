import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { ReferenceController } from './reference.controller.js';
import { ReferenceService } from './reference.service.js';
import { ReferenceRepository } from '../../infrastructure/repositories/reference.repository.js';
import { MikroOrmReferenceRepository } from '../../infrastructure/repositories/mikro-orm-reference.repository.js';

@Module({
  controllers: [ReferenceController],
  providers: [ReferenceService, IdempotencyService, { provide: ReferenceRepository, useClass: MikroOrmReferenceRepository }],
  exports: [ReferenceService]
})
export class ReferenceModule { }
