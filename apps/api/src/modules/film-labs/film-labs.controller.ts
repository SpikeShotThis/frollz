import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createFilmLabRequestSchema, listFilmLabsQuerySchema, updateFilmLabRequestSchema } from '@frollz2/schema';
import { ZodSchemaPipe } from '../../common/pipes/zod-schema.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FilmLabsService } from './film-labs.service.js';

@ApiTags('film-labs')
@Controller('film-labs')
export class FilmLabsController {
  constructor(@Inject(FilmLabsService) private readonly filmLabsService: FilmLabsService) {}

  @Get()
  @ApiOperation({ summary: 'List film labs for the current user' })
  @ApiResponse({ status: 200, description: 'Film lab list' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodSchemaPipe(listFilmLabsQuerySchema)) query: typeof listFilmLabsQuerySchema['_output']
  ) {
    return this.filmLabsService.list(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a film lab by id' })
  @ApiResponse({ status: 200, description: 'Film lab detail' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.filmLabsService.getById(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a film lab' })
  @ApiResponse({ status: 201, description: 'Film lab created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodSchemaPipe(createFilmLabRequestSchema)) body: typeof createFilmLabRequestSchema['_output']
  ) {
    return this.filmLabsService.create(user.userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a film lab' })
  @ApiResponse({ status: 200, description: 'Film lab updated' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodSchemaPipe(updateFilmLabRequestSchema)) body: typeof updateFilmLabRequestSchema['_output']
  ) {
    return this.filmLabsService.update(user.userId, id, body);
  }
}
