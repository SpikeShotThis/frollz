import {
  BadRequestException,
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
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EmulsionService } from './application/emulsion.service';
import { CreateEmulsionDto } from './dto/create-emulsion.dto';
import { CreateEmulsionMultipleFormatsDto } from './dto/create-emulsion-multiple-formats.dto';
import { UpdateEmulsionDto } from './dto/update-emulsion.dto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

  @Put(':id/box-image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace the box image for an emulsion (max 4 MB)' })
  async uploadBoxImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<void> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    return this.emulsionService.uploadBoxImage(id, file.buffer, file.mimetype);
  }

  @Get(':id/box-image')
  @ApiOperation({ summary: 'Serve the box image for an emulsion' })
  async getBoxImage(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const image = await this.emulsionService.getBoxImage(id);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(image.data);
  }
}
