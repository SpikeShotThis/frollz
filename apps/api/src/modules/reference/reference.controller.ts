import { Controller, Get, Inject, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service.js';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  constructor(@Inject(ReferenceService) private readonly referenceService: ReferenceService) { }

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

  @Get('receiver-types')
  @ApiOperation({ summary: 'List all receiver types' })
  @ApiResponse({ status: 200, description: 'Receiver types' })
  listReceiverTypes() {
    return this.referenceService.listReceiverTypes();
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
}
