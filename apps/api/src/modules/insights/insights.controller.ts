import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { insightsQuerySchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { InsightsService } from './insights.service.js';

@ApiTags('insights')
@Controller('insights')
export class InsightsController {
  constructor(@Inject(InsightsService) private readonly insightsService: InsightsService) {}

  @Get('film')
  @ApiOperation({ summary: 'Get film workflow insights' })
  @ApiResponse({ status: 200, description: 'Film workflow insights' })
  film(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(insightsQuerySchema)) query: typeof insightsQuerySchema['_output']
  ) {
    return this.insightsService.film(user.userId, query);
  }

  @Get('admin/labs')
  @ApiOperation({ summary: 'Get lab performance insights' })
  @ApiResponse({ status: 200, description: 'Lab performance insights' })
  labs(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(insightsQuerySchema)) query: typeof insightsQuerySchema['_output']
  ) {
    return this.insightsService.labs(user.userId, query);
  }

  @Get('admin/suppliers')
  @ApiOperation({ summary: 'Get supplier price insights' })
  @ApiResponse({ status: 200, description: 'Supplier price insights' })
  suppliers(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(insightsQuerySchema)) query: typeof insightsQuerySchema['_output']
  ) {
    return this.insightsService.suppliers(user.userId, query);
  }

  @Get('devices/summary')
  @ApiOperation({ summary: 'Get device usage summary insights' })
  @ApiResponse({ status: 200, description: 'Device usage summary insights' })
  devices(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(insightsQuerySchema)) query: typeof insightsQuerySchema['_output']
  ) {
    return this.insightsService.devices(user.userId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary insights' })
  @ApiResponse({ status: 200, description: 'Dashboard summary insights' })
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(insightsQuerySchema)) query: typeof insightsQuerySchema['_output']
  ) {
    return this.insightsService.dashboard(user.userId, query);
  }
}
