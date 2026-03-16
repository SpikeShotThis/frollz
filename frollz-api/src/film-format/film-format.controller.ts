import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FilmFormatService } from './film-format.service';
import { CreateFilmFormatDto } from './dto/create-film-format.dto';
import { UpdateFilmFormatDto } from './dto/update-film-format.dto';
import { FilmFormat } from './entities/film-format.entity';

@ApiTags('film-formats')
@Controller('film-formats')
export class FilmFormatController {
  constructor(private readonly filmFormatService: FilmFormatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new film format' })
  @ApiResponse({ status: 201, description: 'Film format created successfully', type: FilmFormat })
  create(@Body() createFilmFormatDto: CreateFilmFormatDto): Promise<FilmFormat> {
    return this.filmFormatService.create(createFilmFormatDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all film formats' })
  @ApiResponse({ status: 200, description: 'Film formats retrieved successfully', type: [FilmFormat] })
  findAll(): Promise<FilmFormat[]> {
    return this.filmFormatService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a film format by key' })
  @ApiResponse({ status: 200, description: 'Film format retrieved successfully', type: FilmFormat })
  @ApiResponse({ status: 404, description: 'Film format not found' })
  async findOne(@Param('key') key: string): Promise<FilmFormat> {
    const filmFormat = await this.filmFormatService.findOne(key);
    if (!filmFormat) {
      throw new NotFoundException('Film format not found');
    }
    return filmFormat;
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a film format' })
  @ApiResponse({ status: 200, description: 'Film format updated successfully', type: FilmFormat })
  @ApiResponse({ status: 404, description: 'Film format not found' })
  async update(@Param('key') key: string, @Body() updateFilmFormatDto: UpdateFilmFormatDto): Promise<FilmFormat> {
    const filmFormat = await this.filmFormatService.update(key, updateFilmFormatDto);
    if (!filmFormat) {
      throw new NotFoundException('Film format not found');
    }
    return filmFormat;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a film format' })
  @ApiResponse({ status: 200, description: 'Film format deleted successfully' })
  @ApiResponse({ status: 404, description: 'Film format not found' })
  async remove(@Param('key') key: string): Promise<{ message: string }> {
    const deleted = await this.filmFormatService.remove(key);
    if (!deleted) {
      throw new NotFoundException('Film format not found');
    }
    return { message: 'Film format deleted successfully' };
  }
}