import { Body, Controller, Delete, Get, Headers, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createDeviceMountRequestSchema,
  createFilmDeviceRequestSchema,
  unmountDeviceRequestSchema,
  updateFilmDeviceRequestSchema
} from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { DevicesService } from './devices.service.js';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) { }

  @Get()
  @ApiOperation({ summary: 'List all devices for the current user' })
  @ApiResponse({ status: 200, description: 'Device list' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.list(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a device by id' })
  @ApiResponse({ status: 200, description: 'Device detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findById(user.userId, id);
  }

  @Get(':id/load-events')
  @ApiOperation({ summary: 'List film load events for a device' })
  @ApiResponse({ status: 200, description: 'Device load events' })
  listLoadEvents(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.devicesService.listLoadEvents(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a device' })
  @ApiResponse({ status: 201, description: 'Device created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createFilmDeviceRequestSchema)) body: typeof createFilmDeviceRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'devices.create',
      requestPayload: body,
      handler: () => this.devicesService.create(user.userId, body)
    });
  }

  @Get(':id/mounts')
  @ApiOperation({ summary: 'List mount history for a camera device' })
  @ApiResponse({ status: 200, description: 'Device mount history' })
  listMounts(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.devicesService.listMounts(user.userId, id);
  }

  @Post(':id/mount')
  @ApiOperation({ summary: 'Mount a compatible device to a camera' })
  @ApiResponse({ status: 201, description: 'Mount created' })
  mount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(createDeviceMountRequestSchema)) body: typeof createDeviceMountRequestSchema['_output']
  ) {
    return this.devicesService.mount(user.userId, id, body);
  }

  @Post(':id/unmount')
  @ApiOperation({ summary: 'Unmount a mounted device from a camera' })
  @ApiResponse({ status: 200, description: 'Mount closed' })
  unmount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(unmountDeviceRequestSchema)) body: typeof unmountDeviceRequestSchema['_output']
  ) {
    return this.devicesService.unmount(user.userId, id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device' })
  @ApiResponse({ status: 200, description: 'Device updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(updateFilmDeviceRequestSchema)) body: typeof updateFilmDeviceRequestSchema['_output']
  ) {
    return this.devicesService.update(user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a device' })
  @ApiResponse({ status: 200, description: 'Device deleted' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.devicesService.delete(user.userId, id);

    return null;
  }
}
