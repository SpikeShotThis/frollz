import { Body, Controller, Get, Headers, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createFilmSupplierRequestSchema, listFilmSuppliersQuerySchema, updateFilmSupplierRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FilmSuppliersService } from './film-suppliers.service.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';

@ApiTags('film-suppliers')
@Controller('film-suppliers')
export class FilmSuppliersController {
  constructor(
    @Inject(FilmSuppliersService) private readonly filmSuppliersService: FilmSuppliersService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List film suppliers for the current user' })
  @ApiResponse({ status: 200, description: 'Film supplier list' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(listFilmSuppliersQuerySchema)) query: typeof listFilmSuppliersQuerySchema['_output']
  ) {
    return this.filmSuppliersService.list(user.userId, query);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get film supplier purchase activity and per-format metrics' })
  @ApiResponse({ status: 200, description: 'Film supplier activity detail' })
  activity(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.filmSuppliersService.activity(user.userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a film supplier by id' })
  @ApiResponse({ status: 200, description: 'Film supplier detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.filmSuppliersService.getById(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a film supplier' })
  @ApiResponse({ status: 201, description: 'Film supplier created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createFilmSupplierRequestSchema)) body: typeof createFilmSupplierRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'film-suppliers.create',
      requestPayload: body,
      handler: () => this.filmSuppliersService.create(user.userId, body)
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a film supplier' })
  @ApiResponse({ status: 200, description: 'Film supplier updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(updateFilmSupplierRequestSchema)) body: typeof updateFilmSupplierRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'film-suppliers.update',
      requestPayload: { id, body },
      handler: () => this.filmSuppliersService.update(user.userId, id, body)
    });
  }
}
