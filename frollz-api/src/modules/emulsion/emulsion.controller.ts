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
import { EmulsionService } from './application/emulsion.service';
import { CreateEmulsionDto } from './dto/create-emulsion.dto';
import { CreateEmulsionMultipleFormatsDto } from './dto/create-emulsion-multiple-formats.dto';
import { UpdateEmulsionDto } from './dto/update-emulsion.dto';

@ApiTags('Emulsions')
@Controller('emulsions')
export class EmulsionController {
  constructor(private readonly emulsionService: EmulsionService) {}

  @Get()
  @ApiOperation({ summary: 'List all emulsions (film stocks)' })
  findAll() {
    return this.emulsionService.findAll();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Typeahead: distinct brand names' })
  @ApiQuery({ name: 'q', required: false })
  findBrands(@Query('q') q?: string) {
    return this.emulsionService.findBrands(q);
  }

  @Get('manufacturers')
  @ApiOperation({ summary: 'Typeahead: distinct manufacturer names' })
  @ApiQuery({ name: 'q', required: false })
  findManufacturers(@Query('q') q?: string) {
    return this.emulsionService.findManufacturers(q);
  }

  @Get('speeds')
  @ApiOperation({ summary: 'Typeahead: distinct ISO speeds' })
  @ApiQuery({ name: 'q', required: false })
  findSpeeds(@Query('q') q?: string) {
    return this.emulsionService.findSpeeds(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an emulsion by id' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.emulsionService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an emulsion' })
  create(@Body() dto: CreateEmulsionDto) {
    return this.emulsionService.create(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create one emulsion per format from a single set of properties' })
  createMultipleFormats(@Body() dto: CreateEmulsionMultipleFormatsDto) {
    return this.emulsionService.createMultipleFormats(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an emulsion' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmulsionDto) {
    return this.emulsionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an emulsion' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.emulsionService.delete(id);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Associate a tag with an emulsion' })
  addTag(@Param('id', ParseIntPipe) id: number, @Body('tagId') tagId: number) {
    return this.emulsionService.addTag(id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from an emulsion' })
  removeTag(@Param('id', ParseIntPipe) id: number, @Param('tagId', ParseIntPipe) tagId: number) {
    return this.emulsionService.removeTag(id, tagId);
  }
}
