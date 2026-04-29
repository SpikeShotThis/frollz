import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { listReferenceValuesQuerySchema, upsertReferenceValuesRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReferenceService } from './reference.service.js';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  constructor(
    @Inject(ReferenceService) private readonly referenceService: ReferenceService
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all reference tables' })
  @ApiResponse({ status: 200, description: 'All reference tables' })
  getAll() {
    return this.referenceService.getAll();
  }

  @Get('film-formats')
  @ApiOperation({ summary: 'List all film formats' })
  @ApiResponse({ status: 200, description: 'Film formats' })
  listFilmFormats() {
    return this.referenceService.listFilmFormats();
  }

  @Get('development-processes')
  @ApiOperation({ summary: 'List all development processes' })
  @ApiResponse({ status: 200, description: 'Development processes' })
  listDevelopmentProcesses() {
    return this.referenceService.listDevelopmentProcesses();
  }

  @Get('package-types')
  @ApiOperation({ summary: 'List all package types' })
  @ApiResponse({ status: 200, description: 'Package types' })
  listPackageTypes() {
    return this.referenceService.listPackageTypes();
  }

  @Get('film-states')
  @ApiOperation({ summary: 'List all film states' })
  @ApiResponse({ status: 200, description: 'Film states' })
  listFilmStates() {
    return this.referenceService.listFilmStates();
  }

  @Get('storage-locations')
  @ApiOperation({ summary: 'List all storage locations' })
  @ApiResponse({ status: 200, description: 'Storage locations' })
  listStorageLocations() {
    return this.referenceService.listStorageLocations();
  }

  @Get('slot-states')
  @ApiOperation({ summary: 'List all slot states' })
  @ApiResponse({ status: 200, description: 'Slot states' })
  listSlotStates() {
    return this.referenceService.listSlotStates();
  }

  @Get('device-types')
  @ApiOperation({ summary: 'List all device types' })
  @ApiResponse({ status: 200, description: 'Device types' })
  listDeviceTypes() {
    return this.referenceService.listDeviceTypes();
  }

  @Get('holder-types')
  @ApiOperation({ summary: 'List all holder types' })
  @ApiResponse({ status: 200, description: 'Holder types' })
  listHolderTypes() {
    return this.referenceService.listHolderTypes();
  }

  @Get('values')
  @ApiOperation({ summary: 'List ranked user reference values for a kind' })
  @ApiResponse({ status: 200, description: 'Reference value suggestions' })
  listValues(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(listReferenceValuesQuerySchema)) query: typeof listReferenceValuesQuerySchema['_output']
  ) {
    return this.referenceService.listReferenceValues(user.userId, query);
  }

  @Post('values/upsert-batch')
  @ApiOperation({ summary: 'Upsert user reference values' })
  @ApiResponse({ status: 201, description: 'Reference values upserted' })
  async upsertBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodSchemaPipe(upsertReferenceValuesRequestSchema)) body: typeof upsertReferenceValuesRequestSchema['_output']
  ) {
    await this.referenceService.upsertReferenceValues(user.userId, body.items);
    return null;
  }

}
