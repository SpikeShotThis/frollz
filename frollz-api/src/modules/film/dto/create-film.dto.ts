import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateFilmDto {
  @ApiProperty({ example: 'Roll 001' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID of the emulsion loaded in this film', example: '1' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  emulsionId: number;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expirationDate: string;

  @ApiPropertyOptional({ description: 'ID of the parent bulk canister', example: '1' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  parentId?: number;

  @ApiProperty({ description: 'ID of the transition profile governing this film\'s workflow', example: '1' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  transitionProfileId: number;
}
