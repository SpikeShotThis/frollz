import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ThrottleLimits } from "../common/throttle-limits";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { RollTagService } from "./roll-tag.service";
import { CreateRollTagDto } from "./dto/create-roll-tag.dto";
import { RollTag } from "./entities/roll-tag.entity";

@ApiTags("roll-tags")
@Controller("roll-tags")
export class RollTagController {
  constructor(private readonly rollTagService: RollTagService) {}

  @Post()
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Associate a tag with a roll" })
  @ApiResponse({
    status: 201,
    description: "RollTag created successfully",
    type: RollTag,
  })
  create(@Body() createRollTagDto: CreateRollTagDto): Promise<RollTag> {
    return this.rollTagService.create(createRollTagDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all roll-tag associations, optionally filtered",
  })
  @ApiResponse({
    status: 200,
    description: "RollTags retrieved successfully",
    type: [RollTag],
  })
  @ApiQuery({ name: "rollKey", required: false })
  @ApiQuery({ name: "tagKey", required: false })
  findAll(
    @Query("rollKey") rollKey?: string,
    @Query("tagKey") tagKey?: string,
  ): Promise<RollTag[]> {
    if (rollKey) return this.rollTagService.findByRoll(rollKey);
    if (tagKey) return this.rollTagService.findByTag(tagKey);
    return this.rollTagService.findAll();
  }

  @Get(":key")
  @ApiOperation({ summary: "Get a roll-tag association by key" })
  @ApiResponse({
    status: 200,
    description: "RollTag retrieved successfully",
    type: RollTag,
  })
  @ApiResponse({ status: 404, description: "RollTag not found" })
  async findOne(@Param("key") key: string): Promise<RollTag> {
    const rollTag = await this.rollTagService.findOne(key);
    if (!rollTag) {
      throw new NotFoundException("RollTag not found");
    }
    return rollTag;
  }

  @Delete(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Remove a roll-tag association" })
  @ApiResponse({ status: 200, description: "RollTag deleted successfully" })
  @ApiResponse({ status: 404, description: "RollTag not found" })
  async remove(@Param("key") key: string): Promise<{ message: string }> {
    const deleted = await this.rollTagService.remove(key);
    if (!deleted) {
      throw new NotFoundException("RollTag not found");
    }
    return { message: "RollTag deleted successfully" };
  }
}
