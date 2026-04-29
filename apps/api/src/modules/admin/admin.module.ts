import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, IdempotencyService],
  exports: [AdminService]
})
export class AdminModule { }
