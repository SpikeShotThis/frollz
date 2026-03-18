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
import { StockTagService } from "./stock-tag.service";
import { CreateStockTagDto } from "./dto/create-stock-tag.dto";
import { StockTag } from "./entities/stock-tag.entity";

@ApiTags("stock-tags")
@Controller("stock-tags")
export class StockTagController {
  constructor(private readonly stockTagService: StockTagService) {}

  @Post()
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Associate a tag with a stock" })
  @ApiResponse({
    status: 201,
    description: "StockTag created successfully",
    type: StockTag,
  })
  create(@Body() createStockTagDto: CreateStockTagDto): Promise<StockTag> {
    return this.stockTagService.create(createStockTagDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all stock-tag associations, optionally filtered",
  })
  @ApiResponse({
    status: 200,
    description: "StockTags retrieved successfully",
    type: [StockTag],
  })
  @ApiQuery({ name: "stockKey", required: false })
  @ApiQuery({ name: "tagKey", required: false })
  findAll(
    @Query("stockKey") stockKey?: string,
    @Query("tagKey") tagKey?: string,
  ): Promise<StockTag[]> {
    if (stockKey) return this.stockTagService.findByStock(stockKey);
    if (tagKey) return this.stockTagService.findByTag(tagKey);
    return this.stockTagService.findAll();
  }

  @Get(":key")
  @ApiOperation({ summary: "Get a stock-tag association by key" })
  @ApiResponse({
    status: 200,
    description: "StockTag retrieved successfully",
    type: StockTag,
  })
  @ApiResponse({ status: 404, description: "StockTag not found" })
  async findOne(@Param("key") key: string): Promise<StockTag> {
    const stockTag = await this.stockTagService.findOne(key);
    if (!stockTag) {
      throw new NotFoundException("StockTag not found");
    }
    return stockTag;
  }

  @Delete(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Remove a stock-tag association" })
  @ApiResponse({ status: 200, description: "StockTag deleted successfully" })
  @ApiResponse({ status: 404, description: "StockTag not found" })
  async remove(@Param("key") key: string): Promise<{ message: string }> {
    const deleted = await this.stockTagService.remove(key);
    if (!deleted) {
      throw new NotFoundException("StockTag not found");
    }
    return { message: "StockTag deleted successfully" };
  }
}
