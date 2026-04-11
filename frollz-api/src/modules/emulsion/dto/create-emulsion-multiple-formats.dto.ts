import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateEmulsionMultipleFormatsDto {
  @ApiProperty({ example: 'HP5 Plus' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Ilford' })
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiProperty({ example: 'Harman Technology' })
  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @ApiProperty({ example: 400 })
  @IsNumber()
  @IsPositive()
  speed!: number;

  @ApiProperty({ description: 'ID of the process', example: '1' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  processId!: number;

  @ApiProperty({ description: 'One emulsion will be created per format ID', example: ['1', '2'] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  formatIds!: number[];

  @ApiPropertyOptional({ description: 'ID of the base emulsion', example: '1' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  parentId?: number;
}
