import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Stock } from './entities/stock.entity';

@ApiTags('stocks')
@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock' })
  @ApiResponse({ status: 201, description: 'Stock created successfully', type: Stock })
  create(@Body() createStockDto: CreateStockDto): Promise<Stock> {
    return this.stockService.create(createStockDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stocks' })
  @ApiResponse({ status: 200, description: 'Stocks retrieved successfully', type: [Stock] })
  findAll(): Promise<Stock[]> {
    return this.stockService.findAll();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get distinct brand names matching a query' })
  @ApiResponse({ status: 200, description: 'Matching brand names', type: [String] })
  getBrands(@Query('q') q: string): Promise<string[]> {
    return this.stockService.getBrands(q ?? '');
  }

  @Get('manufacturers')
  @ApiOperation({ summary: 'Get distinct manufacturer names matching a query' })
  @ApiResponse({ status: 200, description: 'Matching manufacturer names', type: [String] })
  getManufacturers(@Query('q') q: string): Promise<string[]> {
    return this.stockService.getManufacturers(q ?? '');
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a stock by key' })
  @ApiResponse({ status: 200, description: 'Stock retrieved successfully', type: Stock })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async findOne(@Param('key') key: string): Promise<Stock> {
    const stock = await this.stockService.findOne(key);
    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    return stock;
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a stock' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully', type: Stock })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async update(@Param('key') key: string, @Body() updateStockDto: UpdateStockDto): Promise<Stock> {
    const stock = await this.stockService.update(key, updateStockDto);
    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    return stock;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a stock' })
  @ApiResponse({ status: 200, description: 'Stock deleted successfully' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async remove(@Param('key') key: string): Promise<{ message: string }> {
    const deleted = await this.stockService.remove(key);
    if (!deleted) {
      throw new NotFoundException('Stock not found');
    }
    return { message: 'Stock deleted successfully' };
  }
}