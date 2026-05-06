import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createEmulsionRequestSchema, updateEmulsionRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { EmulsionsService } from './emulsions.service.js';

@ApiTags('emulsions')
@Controller('emulsions')
export class EmulsionsController {
  constructor(
    @Inject(EmulsionsService) private readonly emulsionsService: EmulsionsService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) { }

  @Get()
  @ApiOperation({ summary: 'List all emulsions' })
  @ApiResponse({ status: 200, description: 'Emulsions' })
  list() {
    return this.emulsionsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an emulsion by id' })
  @ApiResponse({ status: 200, description: 'Emulsion' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.emulsionsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an emulsion' })
  @ApiResponse({ status: 201, description: 'Emulsion created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createEmulsionRequestSchema)) body: typeof createEmulsionRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'emulsions.create',
      requestPayload: body,
      handler: () => this.emulsionsService.create(user.userId, body)
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an emulsion' })
  @ApiResponse({ status: 200, description: 'Emulsion updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(updateEmulsionRequestSchema)) body: typeof updateEmulsionRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'emulsions.update',
      requestPayload: { id, body },
      handler: () => this.emulsionsService.update(user.userId, id, body)
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an emulsion' })
  @ApiResponse({ status: 204, description: 'Emulsion deleted' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Headers('idempotency-key') idempotencyKey: string | undefined
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'emulsions.delete',
      requestPayload: { id },
      handler: async () => {
        await this.emulsionsService.delete(id);
        return null;
      }
    });
  }
}
