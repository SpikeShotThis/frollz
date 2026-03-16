import { Module } from '@nestjs/common';
import { StockTagService } from './stock-tag.service';
import { StockTagController } from './stock-tag.controller';

@Module({
  controllers: [StockTagController],
  providers: [StockTagService],
  exports: [StockTagService],
})
export class StockTagModule {}
