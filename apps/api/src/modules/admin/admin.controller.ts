import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { importDataRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdminService } from './admin.service.js';
import { DomainError } from '../../domain/errors.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) { }

  @Get('export')
  @ApiOperation({ summary: 'Export all user data as JSON' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportData(@CurrentUser() user: AuthenticatedUser) {
    const exportData = await this.adminService.exportUserData(user.userId);
    return {
      data: exportData,
      meta: {}
    };
  }

  @Post('import')
  @ApiOperation({ summary: 'Import user data from JSON' })
  @ApiResponse({ status: 200, description: 'User data imported successfully' })
  importData(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(importDataRequestSchema)) body: typeof importDataRequestSchema['_output']
  ) {
    if (user.email !== body.user.email) {
      throw new DomainError('FORBIDDEN', 'You can only import data for your own user account');
    }
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'admin.import-data',
      requestPayload: body,
      handler: async () => {
        await this.adminService.importUserData(user.userId, body);
        return {
          success: true,
          meta: {}
        };
      }
    });
  }
}
