import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created successfully', type: Tag })
  create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully', type: [Tag] })
  findAll(): Promise<Tag[]> {
    return this.tagService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a tag by key' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully', type: Tag })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findOne(@Param('key') key: string): Promise<Tag> {
    const tag = await this.tagService.findOne(key);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully', type: Tag })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async update(@Param('key') key: string, @Body() updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagService.update(key, updateTagDto);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async remove(@Param('key') key: string): Promise<{ message: string }> {
    const deleted = await this.tagService.remove(key);
    if (!deleted) {
      throw new NotFoundException('Tag not found');
    }
    return { message: 'Tag deleted successfully' };
  }
}
