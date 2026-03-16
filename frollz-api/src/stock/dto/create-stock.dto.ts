import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsArray, IsOptional, IsUrl } from 'class-validator';
import { Process } from '../entities/stock.entity';

export class CreateStockDto {
  @ApiProperty()
  @IsString()
  formatKey: string;

  @ApiProperty({ enum: Process })
  @IsEnum(Process)
  process: Process;

  @ApiProperty()
  @IsString()
  manufacturer: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  baseStockKey?: string;

  @ApiProperty()
  @IsNumber()
  speed: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  boxImageUrl?: string;
}