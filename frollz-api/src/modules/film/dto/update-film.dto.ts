import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateFilmDto {
  @ApiPropertyOptional({ example: 'Roll 001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'ID of the emulsion', example: '1' })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
    @IsPositive()
  emulsionId?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'ID of the transition profile governing this film\'s workflow', example: '1' })
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  transitionprofileId?: number;
}
