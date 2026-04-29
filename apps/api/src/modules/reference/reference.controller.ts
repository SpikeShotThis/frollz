import { Body, Controller, Get, Headers, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createEmulsionRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReferenceService } from './reference.service.js';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  constructor(
    @Inject(ReferenceService) private readonly referenceService: ReferenceService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
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

  @Get('emulsions')
  @ApiOperation({ summary: 'List all emulsions' })
  @ApiResponse({ status: 200, description: 'Emulsions' })
  listEmulsions() {
    return this.referenceService.listEmulsions();
  }

  @Get('emulsions/:id')
  @ApiOperation({ summary: 'Get an emulsion by id' })
  @ApiResponse({ status: 200, description: 'Emulsion' })
  findEmulsionById(@Param('id', ParseIntPipe) id: number) {
    return this.referenceService.findEmulsionById(id);
  }

  @Post('emulsions')
  @ApiOperation({ summary: 'Create an emulsion' })
  @ApiResponse({ status: 201, description: 'Emulsion created' })
  createEmulsion(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createEmulsionRequestSchema)) body: typeof createEmulsionRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'reference.emulsions.create',
      requestPayload: body,
      handler: () => this.referenceService.createEmulsion(body)
    });
  }
}
