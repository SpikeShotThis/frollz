import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFormatDto } from './dto/create-format.dto';
import { UpdateFormatDto } from './dto/update-format.dto';
import { FormatService } from './application/format.service';

@ApiTags('Formats')
@Controller('formats')
export class FormatController {
  constructor(private readonly formatService: FormatService) {}

  @Get()
  @ApiOperation({ summary: 'List all formats with their package type' })
  findAll() {
    return this.formatService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a format by id' })
  findById(@Param('id') id: number) {
    return this.formatService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a format' })
  create(@Body() dto: CreateFormatDto) {
    return this.formatService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a format' })
  update(@Param('id') id: number, @Body() dto: UpdateFormatDto) {
    return this.formatService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a format' })
  delete(@Param('id') id: number) {
    return this.formatService.delete(id);
  }
}
