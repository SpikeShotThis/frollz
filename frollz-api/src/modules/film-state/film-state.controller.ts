import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilmStateService } from './application/film-state.service';

@ApiTags('Film States')
@Controller('film-states')
export class FilmStateController {
  constructor(private readonly filmStateService: FilmStateService) {}

  @Get()
  @ApiOperation({ summary: 'Get state history for a film' })
  @ApiQuery({ name: 'filmId', required: true })
  findByFilmId(@Query('filmId', ParseIntPipe) filmId: number) {
    return this.filmStateService.findByFilmId(filmId);
  }
}
