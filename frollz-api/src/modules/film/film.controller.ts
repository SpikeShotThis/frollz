import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilmService } from './application/film.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { TransitionFilmDto } from './dto/transition-film.dto';

@ApiTags('Films')
@Controller('films')
export class FilmController {
  constructor(private readonly filmService: FilmService) {}

  @Get()
  @ApiOperation({ summary: 'List all films, optionally filtered by current state name' })
  @ApiQuery({ name: 'state', required: false, isArray: true, description: 'Filter by state name(s)' })
  findAll(@Query('state') state?: string | string[]) {
    const stateNames = state ? (Array.isArray(state) ? state : [state]) : undefined;
    return this.filmService.findAll(stateNames);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a film by id' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.filmService.findById(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'List child films cut from a bulk canister' })
  findChildren(@Param('id', ParseIntPipe) id: number) {
    return this.filmService.findChildren(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a film' })
  create(@Body() dto: CreateFilmDto) {
    return this.filmService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a film' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFilmDto) {
    return this.filmService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a film' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.filmService.delete(id);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Associate a tag with a film' })
  addTag(@Param('id', ParseIntPipe) id: number, @Body('tagId') tagId: number) {
    return this.filmService.addTag(id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from a film' })
  removeTag(@Param('id', ParseIntPipe) id: number, @Param('tagId', ParseIntPipe) tagId: number) {
    return this.filmService.removeTag(id, tagId);
  }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition a film to a new state' })
  transition(@Param('id', ParseIntPipe) id: number, @Body() dto: TransitionFilmDto) {
    return this.filmService.transition(id, dto);
  }
}
