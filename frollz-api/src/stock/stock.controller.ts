import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ThrottleLimits } from "../common/throttle-limits";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { StockService } from "./stock.service";
import { CreateStockDto } from "./dto/create-stock.dto";
import { CreateStockMultipleFormatsDto } from "./dto/create-stock-multiple-formats.dto";
import { UpdateStockDto } from "./dto/update-stock.dto";
import { TypeaheadQueryDto } from "./dto/typeahead-query.dto";
import { Stock } from "./entities/stock.entity";

@ApiTags("stocks")
@Controller("stocks")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Create a new stock" })
  @ApiResponse({
    status: 201,
    description: "Stock created successfully",
    type: Stock,
  })
  create(@Body() createStockDto: CreateStockDto): Promise<Stock> {
    return this.stockService.create(createStockDto);
  }

  @Post("bulk")
  @Throttle({ default: ThrottleLimits._10_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Create stocks for multiple formats at once" })
  @ApiResponse({
    status: 201,
    description: "Stocks created successfully",
    type: [Stock],
  })
  createMultipleFormats(
    @Body() dto: CreateStockMultipleFormatsDto,
  ): Promise<Stock[]> {
    return this.stockService.createMultipleFormats(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all stocks" })
  @ApiResponse({
    status: 200,
    description: "Stocks retrieved successfully",
    type: [Stock],
  })
  findAll(): Promise<Stock[]> {
    return this.stockService.findAll();
  }

  @Get("brands")
  @Throttle({ default: ThrottleLimits._30_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Get distinct brand names matching a query" })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Substring filter for brand names",
  })
  @ApiResponse({
    status: 200,
    description: "Matching brand names",
    type: [String],
  })
  getBrands(@Query() { q }: TypeaheadQueryDto): Promise<string[]> {
    return this.stockService.getBrands(q ?? "");
  }

  @Get("manufacturers")
  @Throttle({ default: ThrottleLimits._30_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Get distinct manufacturer names matching a query" })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Substring filter for manufacturer names",
  })
  @ApiResponse({
    status: 200,
    description: "Matching manufacturer names",
    type: [String],
  })
  getManufacturers(@Query() { q }: TypeaheadQueryDto): Promise<string[]> {
    return this.stockService.getManufacturers(q ?? "");
  }

  @Get("speeds")
  @Throttle({ default: ThrottleLimits._30_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Get distinct speed values matching a query" })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Substring filter for ISO speed values",
  })
  @ApiResponse({
    status: 200,
    description: "Matching speed values",
    type: [Number],
  })
  getSpeeds(@Query() { q }: TypeaheadQueryDto): Promise<number[]> {
    return this.stockService.getSpeeds(q ?? "");
  }

  @Get(":key")
  @ApiOperation({ summary: "Get a stock by key" })
  @ApiResponse({
    status: 200,
    description: "Stock retrieved successfully",
    type: Stock,
  })
  @ApiResponse({ status: 404, description: "Stock not found" })
  async findOne(@Param("key") key: string): Promise<Stock> {
    const stock = await this.stockService.findOne(key);
    if (!stock) {
      throw new NotFoundException("Stock not found");
    }
    return stock;
  }

  @Patch(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Update a stock" })
  @ApiResponse({
    status: 200,
    description: "Stock updated successfully",
    type: Stock,
  })
  @ApiResponse({ status: 404, description: "Stock not found" })
  async update(
    @Param("key") key: string,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<Stock> {
    const stock = await this.stockService.update(key, updateStockDto);
    if (!stock) {
      throw new NotFoundException("Stock not found");
    }
    return stock;
  }

  @Delete(":key")
  @Throttle({ default: ThrottleLimits._20_REQUESTS_PER_MINUTE })
  @ApiOperation({ summary: "Delete a stock" })
  @ApiResponse({ status: 200, description: "Stock deleted successfully" })
  @ApiResponse({ status: 404, description: "Stock not found" })
  async remove(@Param("key") key: string): Promise<{ message: string }> {
    const deleted = await this.stockService.remove(key);
    if (!deleted) {
      throw new NotFoundException("Stock not found");
    }
    return { message: "Stock deleted successfully" };
  }
}
