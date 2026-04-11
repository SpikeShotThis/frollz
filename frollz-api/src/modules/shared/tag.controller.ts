import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagService } from './application/tag.service';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  findAll() {
    return this.tagService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by id' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
    return this.tagService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.delete(id);
  }
}
