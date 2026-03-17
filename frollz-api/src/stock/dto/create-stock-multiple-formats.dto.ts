import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsOptional, IsUrl, IsArray, ArrayMinSize } from 'class-validator';
import { Process } from '../entities/stock.entity';

export class CreateStockMultipleFormatsDto {
  @ApiProperty({ type: [String], description: 'Array of format keys to create stocks for' })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one format must be selected' })
  @IsString({ each: true })
  formatKeys: string[];

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  boxImageUrl?: string;
}
