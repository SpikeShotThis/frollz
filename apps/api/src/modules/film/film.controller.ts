import { Body, Controller, Get, Headers, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  createFilmJourneyEventRequestSchema,
  filmCreateRequestSchema,
  filmListQuerySchema,
  filmUpdateRequestSchema
} from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FilmService } from './film.service.js';

@ApiTags('film')
@Controller('film')
export class FilmController {
  constructor(
    @Inject(FilmService) private readonly filmService: FilmService,
    @Inject(IdempotencyService) private readonly idempotencyService: IdempotencyService
  ) { }

  @Get()
  @ApiOperation({ summary: 'List the current user film inventory' })
  @ApiResponse({ status: 200, description: 'Film list' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(filmListQuerySchema)) query: typeof filmListQuerySchema['_output']
  ) {
    return this.filmService.list(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a film by id' })
  @ApiResponse({ status: 200, description: 'Film detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.filmService.findById(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new film' })
  @ApiResponse({ status: 201, description: 'Film created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(filmCreateRequestSchema)) body: typeof filmCreateRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'film.create',
      requestPayload: body,
      handler: () => this.filmService.create(user.userId, body)
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a film' })
  @ApiResponse({ status: 200, description: 'Film updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(filmUpdateRequestSchema)) body: typeof filmUpdateRequestSchema['_output']
  ) {
    return this.filmService.update(user.userId, id, body);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Create a film journey event' })
  @ApiResponse({ status: 201, description: 'Journey event created' })
  addEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodSchemaPipe(createFilmJourneyEventRequestSchema)) body: typeof createFilmJourneyEventRequestSchema['_output']
  ) {
    return this.idempotencyService.execute({
      userId: user.userId,
      key: idempotencyKey,
      scope: 'film.create-event',
      requestPayload: { filmId: id, ...body },
      handler: () => this.filmService.createEvent(user.userId, id, body)
    });
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'List all film journey events' })
  @ApiResponse({ status: 200, description: 'Journey event list' })
  listEvents(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.filmService.listEvents(user.userId, id);
  }

}
