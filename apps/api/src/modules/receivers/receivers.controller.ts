import { Body, Controller, Delete, Get, Headers, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createFilmReceiverRequestSchema, updateFilmReceiverRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReceiversService } from './receivers.service.js';

@ApiTags('receivers')
@Controller('receivers')
export class ReceiversController {
  constructor(
    @Inject(ReceiversService) private readonly receiversService: ReceiversService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) { }

  @Get()
  @ApiOperation({ summary: 'List all receivers for the current user' })
  @ApiResponse({ status: 200, description: 'Receiver list' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.receiversService.list(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a receiver by id' })
  @ApiResponse({ status: 200, description: 'Receiver detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.receiversService.findById(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a receiver' })
  @ApiResponse({ status: 201, description: 'Receiver created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createFilmReceiverRequestSchema)) body: typeof createFilmReceiverRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'receivers.create',
      requestPayload: body,
      handler: () => this.receiversService.create(user.userId, body)
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a receiver' })
  @ApiResponse({ status: 200, description: 'Receiver updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(updateFilmReceiverRequestSchema)) body: typeof updateFilmReceiverRequestSchema['_output']
  ) {
    return this.receiversService.update(user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receiver' })
  @ApiResponse({ status: 200, description: 'Receiver deleted' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.receiversService.delete(user.userId, id);

    return null;
  }
}
