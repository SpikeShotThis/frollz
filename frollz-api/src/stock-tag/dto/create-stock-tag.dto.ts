import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateStockTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  tagKey: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  stockKey: string;
}
